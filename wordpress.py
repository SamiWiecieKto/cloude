"""WordPress REST API client."""

import base64
import requests


class WordPressClient:
    def __init__(self, domain: str, username: str, app_password: str):
        self.base_url = domain.rstrip("/") + "/wp-json/wp/v2"
        token = base64.b64encode(f"{username}:{app_password}".encode()).decode()
        self.auth_headers = {
            "Authorization": f"Basic {token}",
        }

    def test_connection(self) -> dict:
        r = requests.get(
            f"{self.base_url}/users/me",
            headers=self.auth_headers,
            timeout=15,
        )
        r.raise_for_status()
        return r.json()

    def get_categories(self) -> list[dict]:
        categories = []
        page = 1
        while True:
            r = requests.get(
                f"{self.base_url}/categories",
                headers=self.auth_headers,
                params={"per_page": 100, "page": page},
                timeout=15,
            )
            r.raise_for_status()
            batch = r.json()
            if not batch:
                break
            categories.extend(batch)
            if len(batch) < 100:
                break
            page += 1
        return categories

    def upload_media(self, image_path: str, filename: str) -> int:
        with open(image_path, "rb") as f:
            data = f.read()
        headers = {
            **self.auth_headers,
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "image/png",
        }
        r = requests.post(
            f"{self.base_url}/media",
            headers=headers,
            data=data,
            timeout=60,
        )
        r.raise_for_status()
        return r.json()["id"]

    def create_post(
        self,
        title: str,
        content: str,
        category_ids: list[int],
        featured_image_id: int | None = None,
        status: str = "publish",
    ) -> tuple[int, str]:
        payload: dict = {
            "title": title,
            "content": content,
            "status": status,
            "categories": category_ids,
        }
        if featured_image_id:
            payload["featured_media"] = featured_image_id

        headers = {**self.auth_headers, "Content-Type": "application/json"}
        r = requests.post(
            f"{self.base_url}/posts",
            headers=headers,
            json=payload,
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
        return data["id"], data["link"]
