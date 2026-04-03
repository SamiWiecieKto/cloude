#!/usr/bin/env python3
"""
WordPress Word Uploader
-----------------------
Upload .docx files as blog posts to WordPress via the REST API.

Usage:
  python app.py --setup              # Configure WordPress credentials
  python app.py --upload /path/docs  # Upload all .docx files in a directory
  python app.py --upload post.docx   # Upload a single file
  python app.py --upload /path --draft  # Upload as drafts
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
import tempfile
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.table import Table

from converter import parse_docx
from image_gen import generate_image
from wordpress import WordPressClient

console = Console()

CONFIG_FILE = Path.home() / ".wp_uploader_config.json"


# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------


def load_config() -> dict:
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_config(config: dict) -> None:
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------


def cmd_setup() -> dict:
    console.print(
        Panel(
            "[bold cyan]WordPress Word Uploader — Setup[/bold cyan]",
            expand=False,
        )
    )

    existing = load_config()

    console.print(
        "\n[dim]You need an Application Password from WordPress:\n"
        "  WP Admin → Users → Your Profile → Application Passwords[/dim]\n"
    )

    domain = Prompt.ask(
        "[bold]WordPress domain[/bold] [dim](e.g. https://example.com)[/dim]",
        default=existing.get("domain", ""),
    ).rstrip("/")

    username = Prompt.ask("[bold]Username[/bold]", default=existing.get("username", ""))

    app_password = Prompt.ask(
        "[bold]Application password[/bold]",
        password=True,
    )

    openai_key = Prompt.ask(
        "[bold]OpenAI API key[/bold] [dim](optional — for AI-generated images, press Enter to skip)[/dim]",
        default=existing.get("openai_key", ""),
        password=True,
    )

    config: dict = {
        "domain": domain,
        "username": username,
        "app_password": app_password,
    }
    if openai_key:
        config["openai_key"] = openai_key

    # Test connection
    console.print("\n[yellow]Testing connection…[/yellow]")
    try:
        wp = WordPressClient(domain, username, app_password)
        user_info = wp.test_connection()
        name = user_info.get("name") or username
        console.print(f"[green]✓ Connected as: {name}[/green]")
    except Exception as exc:
        console.print(f"[red]✗ Connection failed: {exc}[/red]")
        console.print("[dim]Check your domain, username, and application password.[/dim]")
        sys.exit(1)

    save_config(config)
    console.print(f"[green]✓ Configuration saved to {CONFIG_FILE}[/green]\n")
    return config


# ---------------------------------------------------------------------------
# Category matching
# ---------------------------------------------------------------------------


def _strip_html(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html)


def best_category_ids(title: str, html_content: str, categories: list[dict]) -> list[int]:
    """Return the single best-matching category ID (falls back to 1 = Uncategorized)."""
    if not categories:
        return [1]

    combined = (title + " " + _strip_html(html_content)).lower()

    best_score = 0
    best_id = 1  # Uncategorized

    for cat in categories:
        if cat.get("count", 0) == 0 and cat["id"] != 1:
            # Skip empty categories only if there are populated ones
            pass
        name_words = [w for w in re.split(r"\W+", cat["name"].lower()) if len(w) > 2]
        score = sum(combined.count(w) for w in name_words)
        if score > best_score:
            best_score = score
            best_id = cat["id"]

    return [best_id]


# ---------------------------------------------------------------------------
# Upload command
# ---------------------------------------------------------------------------


def cmd_upload(docs_path: str, status: str = "publish") -> None:
    config = load_config()
    if not config:
        console.print("[red]No configuration found. Run with --setup first.[/red]")
        sys.exit(1)

    # Collect .docx files
    p = Path(docs_path)
    if p.is_dir():
        docx_files = sorted(p.glob("*.docx"))
    elif p.is_file() and p.suffix.lower() == ".docx":
        docx_files = [p]
    else:
        docx_files = [Path(f) for f in sorted(glob.glob(docs_path))]

    if not docx_files:
        console.print(f"[red]No .docx files found at: {docs_path}[/red]")
        sys.exit(1)

    console.print(
        Panel(
            f"[bold cyan]WordPress Word Uploader[/bold cyan]\n"
            f"[dim]Site:[/dim] {config['domain']}\n"
            f"[dim]Files found:[/dim] {len(docx_files)}\n"
            f"[dim]Status:[/dim] {status}",
            expand=False,
        )
    )

    # Set OpenAI key if stored
    if config.get("openai_key"):
        os.environ["OPENAI_API_KEY"] = config["openai_key"]

    wp = WordPressClient(config["domain"], config["username"], config["app_password"])

    console.print("[yellow]Fetching WordPress categories…[/yellow]")
    categories = wp.get_categories()
    cat_names_by_id = {c["id"]: c["name"] for c in categories}
    console.print(f"[green]Found {len(categories)} categor{'y' if len(categories)==1 else 'ies'}.[/green]\n")

    results: list[dict] = []

    for idx, docx_path in enumerate(docx_files, start=1):
        filename = docx_path.name
        console.rule(f"[bold]{idx}/{len(docx_files)}: {filename}[/bold]")

        try:
            # 1. Parse DOCX → HTML
            console.print("  [yellow]Parsing document…[/yellow]")
            title, html_content = parse_docx(str(docx_path))
            console.print(f"  [green]Title:[/green] {title}")

            # 2. Select category
            cat_ids = best_category_ids(title, html_content, categories)
            cat_label = ", ".join(cat_names_by_id.get(cid, str(cid)) for cid in cat_ids)
            console.print(f"  [green]Category:[/green] {cat_label}")

            # 3. Generate featured image
            console.print("  [yellow]Generating featured image…[/yellow]")
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                tmp_img_path = tmp.name

            generate_image(title, html_content[:600], tmp_img_path)

            # 4. Upload image to WP media library
            console.print("  [yellow]Uploading image to media library…[/yellow]")
            safe_img_name = re.sub(r"[^\w\-]", "-", docx_path.stem) + "-featured.png"
            media_id = wp.upload_media(tmp_img_path, safe_img_name)
            os.unlink(tmp_img_path)
            console.print(f"  [green]Image uploaded.[/green] (media ID: {media_id})")

            # 5. Create post
            console.print(f"  [yellow]Creating post (status: {status})…[/yellow]")
            post_id, post_url = wp.create_post(
                title=title,
                content=html_content,
                category_ids=cat_ids,
                featured_image_id=media_id,
                status=status,
            )

            console.print(f"  [bold green]✓ Done![/bold green]  ID: {post_id}")
            console.print(f"  [blue underline]{post_url}[/blue underline]")

            results.append(
                {
                    "file": filename,
                    "title": title,
                    "category": cat_label,
                    "post_id": post_id,
                    "url": post_url,
                    "status": "success",
                }
            )

        except Exception as exc:
            console.print(f"  [bold red]✗ FAILED: {exc}[/bold red]")
            results.append(
                {
                    "file": filename,
                    "title": "?",
                    "category": "?",
                    "post_id": None,
                    "url": "",
                    "status": f"FAILED: {exc}",
                }
            )

    # ---------------------------------------------------------------------------
    # Summary table
    # ---------------------------------------------------------------------------
    console.print()
    table = Table(title="Upload Summary", show_header=True, header_style="bold cyan")
    table.add_column("#", style="dim", width=4, justify="right")
    table.add_column("File", style="cyan", max_width=28)
    table.add_column("Title", style="white", max_width=35)
    table.add_column("Category", style="magenta", max_width=18)
    table.add_column("URL", style="blue", max_width=45)
    table.add_column("Result", justify="center")

    for i, r in enumerate(results, 1):
        ok = r["status"] == "success"
        table.add_row(
            str(i),
            r["file"],
            r["title"],
            r["category"],
            r["url"] if ok else "—",
            "[green]✓[/green]" if ok else f"[red]✗ {r['status'][:30]}[/red]",
        )

    console.print(table)

    # Save JSON report
    report_path = Path("upload_results.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    success_count = sum(1 for r in results if r["status"] == "success")
    console.print(
        f"\n[bold green]{success_count}/{len(results)} post(s) uploaded successfully.[/bold green]"
    )
    console.print(f"[dim]Full report saved to: {report_path.resolve()}[/dim]")

    if success_count > 0:
        console.print("\n[bold]Post URLs:[/bold]")
        for r in results:
            if r["status"] == "success":
                console.print(f"  • {r['title']}\n    [blue]{r['url']}[/blue]")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Upload .docx files as WordPress blog posts",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--setup",
        action="store_true",
        help="Configure WordPress credentials (runs interactively)",
    )
    parser.add_argument(
        "--upload",
        metavar="PATH",
        help="Path to a .docx file, a directory, or a glob pattern",
    )
    parser.add_argument(
        "--draft",
        action="store_true",
        help="Upload posts as drafts instead of publishing immediately",
    )

    args = parser.parse_args()

    if args.setup:
        cmd_setup()
        if not args.upload:
            return

    if args.upload:
        status = "draft" if args.draft else "publish"
        cmd_upload(args.upload, status=status)
    elif not args.setup:
        parser.print_help()


if __name__ == "__main__":
    main()
