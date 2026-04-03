"""Convert .docx files to clean HTML preserving structure."""

from __future__ import annotations

from docx import Document
from docx.oxml.ns import qn
from lxml import etree


# Word namespace shorthand
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def _esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _run_to_html(run_elem: etree._Element) -> str:
    """Convert a single <w:r> element to HTML-formatted text."""
    text_parts = []
    for t in run_elem.iter(f"{{{W}}}t"):
        text_parts.append(t.text or "")
    text = "".join(text_parts)
    if not text:
        return ""

    text = _esc(text)

    rpr = run_elem.find(f"{{{W}}}rPr")
    if rpr is not None:
        b = rpr.find(f"{{{W}}}b")
        i = rpr.find(f"{{{W}}}i")
        strike = rpr.find(f"{{{W}}}strike")

        def _is_on(elem):
            if elem is None:
                return False
            val = elem.get(f"{{{W}}}val", "true")
            return val.lower() not in ("0", "false")

        if _is_on(b):
            text = f"<strong>{text}</strong>"
        if _is_on(i):
            text = f"<em>{text}</em>"
        if _is_on(strike):
            text = f"<del>{text}</del>"

    return text


def _para_to_html(para_elem: etree._Element, part) -> str:
    """Convert a single <w:p> element to an HTML string."""
    result = ""

    for child in para_elem:
        local = child.tag.split("}")[-1] if "}" in child.tag else child.tag

        if local == "r":
            result += _run_to_html(child)

        elif local == "hyperlink":
            r_id = child.get(f"{{{R_NS}}}id")
            href = ""
            if r_id:
                try:
                    href = part.rels[r_id].target_ref
                except (KeyError, AttributeError):
                    pass

            link_text = ""
            for grandchild in child:
                gc_local = (
                    grandchild.tag.split("}")[-1]
                    if "}" in grandchild.tag
                    else grandchild.tag
                )
                if gc_local == "r":
                    link_text += _run_to_html(grandchild)

            if href:
                result += f'<a href="{_esc(href)}">{link_text}</a>'
            else:
                result += link_text

    return result


def _is_list_para(para_elem: etree._Element) -> tuple[bool, bool]:
    """Return (is_bullet, is_numbered) based on numPr or style."""
    ppr = para_elem.find(f"{{{W}}}pPr")
    if ppr is not None:
        numpr = ppr.find(f"{{{W}}}numPr")
        if numpr is not None:
            ilvl_elem = numpr.find(f"{{{W}}}ilvl")
            ilvl = int(ilvl_elem.get(f"{{{W}}}val", "0")) if ilvl_elem is not None else 0
            numid_elem = numpr.find(f"{{{W}}}numId")
            numid = int(numid_elem.get(f"{{{W}}}val", "0")) if numid_elem is not None else 0
            if numid > 0:
                # We can't easily distinguish bullet vs numbered without
                # reading numbering.xml, so use style name as hint
                style_elem = ppr.find(f"{{{W}}}pStyle")
                style_val = (
                    style_elem.get(f"{{{W}}}val", "").lower()
                    if style_elem is not None
                    else ""
                )
                if "number" in style_val or "listnum" in style_val:
                    return False, True
                return True, False
    return False, False


def _get_style_name(para_elem: etree._Element) -> str:
    ppr = para_elem.find(f"{{{W}}}pPr")
    if ppr is not None:
        pstyle = ppr.find(f"{{{W}}}pStyle")
        if pstyle is not None:
            return pstyle.get(f"{{{W}}}val", "")
    return ""


def _para_plain_text(para_elem: etree._Element) -> str:
    parts = []
    for t in para_elem.iter(f"{{{W}}}t"):
        parts.append(t.text or "")
    return "".join(parts).strip()


def _table_to_html(table_elem: etree._Element, part) -> str:
    rows = ["<table>"]
    for ri, row in enumerate(table_elem.iter(f"{{{W}}}tr")):
        rows.append("<tr>")
        for cell in row.findall(f"{{{W}}}tc"):
            tag = "th" if ri == 0 else "td"
            cell_html_parts = []
            for p in cell.findall(f"{{{W}}}p"):
                cell_html_parts.append(_para_to_html(p, part))
            rows.append(f"<{tag}>{''.join(cell_html_parts)}</{tag}>")
        rows.append("</tr>")
    rows.append("</table>")
    return "\n".join(rows)


# Map Word style vals -> HTML tags
_HEADING_MAP = {
    "heading1": "h1",
    "heading2": "h2",
    "heading3": "h3",
    "heading4": "h4",
    "heading5": "h5",
    "heading6": "h6",
    "1": "h1",
    "2": "h2",
    "3": "h3",
    "4": "h4",
}


def parse_docx(filepath: str) -> tuple[str, str]:
    """
    Parse a .docx file and return (title, html_content).

    The title is taken from the first Heading 1 (or first non-empty paragraph
    if no H1 exists).  HTML preserves headings, bold, italic, strikethrough,
    bullet lists, numbered lists, hyperlinks, and tables.
    """
    doc = Document(filepath)
    body = doc.element.body

    html_parts: list[str] = []
    title = ""

    # Track open list context: ("ul"|"ol"|None)
    list_stack: list[str] = []  # max depth = 1 for now

    def _close_lists():
        while list_stack:
            tag = list_stack.pop()
            html_parts.append(f"</{tag}>")

    for child in body:
        local = child.tag.split("}")[-1] if "}" in child.tag else child.tag

        if local == "p":
            para_elem = child
            style_val = _get_style_name(para_elem).lower()
            plain = _para_plain_text(para_elem)
            inner = _para_to_html(para_elem, doc.part)

            # Heading?
            heading_tag = None
            for key, tag in _HEADING_MAP.items():
                if style_val == key or style_val.startswith(key):
                    heading_tag = tag
                    break

            if heading_tag:
                _close_lists()
                if not title and heading_tag == "h1":
                    title = plain
                html_parts.append(f"<{heading_tag}>{inner}</{heading_tag}>")
                continue

            # List?
            is_bullet, is_numbered = _is_list_para(para_elem)
            # Also check style name for list
            if not is_bullet and not is_numbered:
                if "listbullet" in style_val or "list bullet" in style_val.replace("-", " "):
                    is_bullet = True
                elif "listnumber" in style_val or "list number" in style_val.replace("-", " "):
                    is_numbered = True

            if is_bullet or is_numbered:
                desired_tag = "ul" if is_bullet else "ol"
                if not list_stack or list_stack[-1] != desired_tag:
                    _close_lists()
                    list_stack.append(desired_tag)
                    html_parts.append(f"<{desired_tag}>")
                if plain:
                    html_parts.append(f"<li>{inner}</li>")
                continue

            # Regular paragraph
            _close_lists()
            if plain:
                if not title:
                    title = plain
                html_parts.append(f"<p>{inner}</p>")

        elif local == "tbl":
            _close_lists()
            html_parts.append(_table_to_html(child, doc.part))

    _close_lists()

    if not title:
        title = "Untitled Post"

    return title, "\n".join(html_parts)
