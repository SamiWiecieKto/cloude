"""Streamlit web interface for WordPress Word Uploader."""

from __future__ import annotations

import os
import re
import tempfile
from pathlib import Path

import streamlit as st

from converter import parse_docx
from image_gen import generate_image
from wordpress import WordPressClient

st.set_page_config(
    page_title="WP Word Uploader",
    page_icon="📝",
    layout="centered",
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _strip_html(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html)


def best_category_ids(title: str, html_content: str, categories: list[dict]) -> list[int]:
    if not categories:
        return [1]
    combined = (title + " " + _strip_html(html_content)).lower()
    best_score, best_id = 0, 1
    for cat in categories:
        words = [w for w in re.split(r"\W+", cat["name"].lower()) if len(w) > 2]
        score = sum(combined.count(w) for w in words)
        if score > best_score:
            best_score, best_id = score, cat["id"]
    return [best_id]


# ---------------------------------------------------------------------------
# UI
# ---------------------------------------------------------------------------

st.title("📝 WordPress Word Uploader")
st.caption("Wgraj pliki .docx i opublikuj je jako posty na WordPress")

# ── Credentials ─────────────────────────────────────────────────────────────
with st.expander("⚙️ Dane dostępowe do WordPress", expanded=True):
    col1, col2 = st.columns(2)
    with col1:
        domain = st.text_input(
            "Domena WordPress",
            placeholder="https://twojadomena.pl",
            help="Pełny adres ze schematem https://",
        )
        username = st.text_input("Login (username)")
    with col2:
        app_password = st.text_input(
            "Hasło aplikacji",
            type="password",
            help="WP Admin → Użytkownicy → Twój profil → Hasła aplikacji",
        )
        openai_key = st.text_input(
            "Klucz OpenAI (opcjonalny)",
            type="password",
            help="Jeśli podasz — grafiki wygeneruje DALL-E 3. Bez klucza używany jest wbudowany generator.",
        )

    post_status = st.radio(
        "Status postów po wgraniu",
        options=["publish", "draft"],
        format_func=lambda x: "✅ Opublikuj od razu" if x == "publish" else "📋 Zapisz jako szkic",
        horizontal=True,
    )

    test_btn = st.button("🔌 Testuj połączenie")
    if test_btn:
        if not domain or not username or not app_password:
            st.error("Wypełnij domenę, login i hasło aplikacji.")
        else:
            try:
                wp = WordPressClient(domain, username, app_password)
                info = wp.test_connection()
                st.success(f"✓ Połączono jako: **{info.get('name', username)}**")
            except Exception as e:
                st.error(f"Błąd połączenia: {e}")

# ── File upload ──────────────────────────────────────────────────────────────
st.divider()
uploaded_files = st.file_uploader(
    "Wgraj pliki Word (.docx)",
    type=["docx"],
    accept_multiple_files=True,
    help="Możesz wybrać wiele plików naraz. Każdy plik = osobny post.",
)

if uploaded_files:
    st.info(f"Wybrano **{len(uploaded_files)}** plik(ów): " + ", ".join(f.name for f in uploaded_files))

# ── Upload button ─────────────────────────────────────────────────────────────
st.divider()
upload_btn = st.button("🚀 Opublikuj posty", type="primary", use_container_width=True)

if upload_btn:
    # Validation
    if not domain or not username or not app_password:
        st.error("Uzupełnij dane dostępowe do WordPress.")
        st.stop()
    if not uploaded_files:
        st.error("Wgraj przynajmniej jeden plik .docx.")
        st.stop()

    if openai_key:
        os.environ["OPENAI_API_KEY"] = openai_key
    elif "OPENAI_API_KEY" in os.environ:
        del os.environ["OPENAI_API_KEY"]

    wp = WordPressClient(domain, username, app_password)

    # Fetch categories once
    with st.spinner("Pobieranie kategorii z WordPress…"):
        try:
            categories = wp.get_categories()
        except Exception as e:
            st.error(f"Nie udało się pobrać kategorii: {e}")
            st.stop()

    cat_by_id = {c["id"]: c["name"] for c in categories}

    results = []
    progress = st.progress(0, text="Przygotowywanie…")
    total = len(uploaded_files)

    for i, uploaded_file in enumerate(uploaded_files):
        filename = uploaded_file.name
        progress.progress((i) / total, text=f"Przetwarzam: {filename}")

        with st.status(f"📄 {filename}", expanded=True) as status_box:
            try:
                # Save uploaded file to temp location
                with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp_docx:
                    tmp_docx.write(uploaded_file.getbuffer())
                    tmp_docx_path = tmp_docx.name

                # Parse
                st.write("🔍 Parsowanie dokumentu…")
                title, html_content = parse_docx(tmp_docx_path)
                os.unlink(tmp_docx_path)
                st.write(f"📌 Tytuł: **{title}**")

                # Category
                cat_ids = best_category_ids(title, html_content, categories)
                cat_label = ", ".join(cat_by_id.get(cid, str(cid)) for cid in cat_ids)
                st.write(f"🏷️ Kategoria: **{cat_label}**")

                # Image
                st.write("🎨 Generowanie grafiki okładkowej…")
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_img:
                    tmp_img_path = tmp_img.name
                generate_image(title, html_content[:600], tmp_img_path)

                # Upload image
                st.write("⬆️ Upload grafiki do biblioteki mediów…")
                safe_name = re.sub(r"[^\w\-]", "-", Path(filename).stem) + "-featured.png"
                media_id = wp.upload_media(tmp_img_path, safe_name)
                os.unlink(tmp_img_path)

                # Create post
                st.write(f"📤 Tworzenie posta (status: {post_status})…")
                post_id, post_url = wp.create_post(
                    title=title,
                    content=html_content,
                    category_ids=cat_ids,
                    featured_image_id=media_id,
                    status=post_status,
                )

                st.write(f"✅ Opublikowano! ID: `{post_id}`")
                st.write(f"🔗 [**{post_url}**]({post_url})")
                status_box.update(label=f"✅ {filename} → {title}", state="complete")

                results.append(
                    {"file": filename, "title": title, "category": cat_label, "url": post_url, "ok": True}
                )

            except Exception as exc:
                st.error(f"Błąd: {exc}")
                status_box.update(label=f"❌ {filename} — błąd", state="error")
                results.append({"file": filename, "title": "?", "category": "?", "url": "", "ok": False, "error": str(exc)})

        progress.progress((i + 1) / total, text=f"Gotowe: {filename}")

    progress.empty()

    # Summary
    st.divider()
    ok_count = sum(1 for r in results if r["ok"])
    if ok_count == total:
        st.success(f"🎉 Wszystkie {total} posty zostały wgrane pomyślnie!")
    elif ok_count > 0:
        st.warning(f"✅ {ok_count}/{total} postów wgranych. Sprawdź błędy powyżej.")
    else:
        st.error("❌ Żaden post nie został wgrany.")

    if ok_count:
        st.subheader("🔗 Linki do postów")
        for r in results:
            if r["ok"]:
                st.markdown(f"- **{r['title']}** — [{r['url']}]({r['url']})")
