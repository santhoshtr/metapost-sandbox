#!/usr/bin/env python3
"""
Migration script: PocketBase → GitHub Gists
Fetches all metapost records from PocketBase and creates corresponding GitHub gists.
"""

import requests
import json
import sys
import time
from datetime import datetime

# Configuration
POCKETBASE_URL = "https://santhosh.pockethost.io"
POCKETBASE_COLLECTION = "metaposts"
GITHUB_API_BASE = "https://api.github.com"
METAPOST_TAG = "#metapost-sandbox"


def fetch_pocketbase_records():
    """Fetch all metapost records from PocketBase"""
    print("📥 Fetching records from PocketBase...")

    url = (
        f"{POCKETBASE_URL}/api/collections/{POCKETBASE_COLLECTION}/records?perPage=1000"
    )
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        records = data.get("items", [])
        print(f"✅ Found {len(records)} records")
        return records
    except Exception as e:
        print(f"❌ Failed to fetch records: {e}")
        sys.exit(1)


def create_gist(record, github_token):
    """Create a GitHub gist from a PocketBase record"""
    title = record.get("title", "Untitled")
    code = record.get("metapost", "")
    author = record.get("author", "")
    created = record.get("created", "")
    updated = record.get("updated", "")
    old_id = record.get("id", "")

    # Build description
    description = f"{title} {METAPOST_TAG}"

    # Create gist payload
    payload = {
        "description": description,
        "public": True,
        "files": {"main.mp": {"content": code}},
    }

    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            f"{GITHUB_API_BASE}/gists", headers=headers, json=payload
        )
        response.raise_for_status()
        gist = response.json()

        print(f"  ✅ Created gist: {gist['id']}")
        print(f"     Title: {title}")
        print(f"     Author: {author}")
        print(f"     Old ID: {old_id} → New ID: {gist['id']}")
        print(f"     URL: {gist['html_url']}")

        return {
            "old_id": old_id,
            "new_id": gist["id"],
            "title": title,
            "author": author,
            "url": gist["html_url"],
        }

    except requests.exceptions.HTTPError as e:
        print(f"  ❌ Failed to create gist for '{title}': {e}")
        if e.response:
            print(f"     Response: {e.response.text}")
        return None
    except Exception as e:
        print(f"  ❌ Failed to create gist for '{title}': {e}")
        return None


def save_migration_log(mappings, filename="migration_log.json"):
    """Save the ID mappings to a log file"""
    with open(filename, "w") as f:
        json.dump(
            {
                "migrated_at": datetime.now().isoformat(),
                "total_records": len(mappings),
                "mappings": mappings,
            },
            f,
            indent=2,
        )
    print(f"\n📝 Migration log saved to: {filename}")


def main():
    print("=" * 60)
    print("PocketBase → GitHub Gists Migration Tool")
    print("=" * 60)
    print()

    # Get GitHub token
    github_token = input("Enter your GitHub Personal Access Token: ").strip()
    if not github_token:
        print("❌ GitHub token is required")
        sys.exit(1)

    print()

    # Verify GitHub token
    print("🔑 Verifying GitHub token...")
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
    }
    try:
        response = requests.get(f"{GITHUB_API_BASE}/user", headers=headers)
        response.raise_for_status()
        user_data = response.json()
        print(f"✅ Authenticated as: {user_data['login']}")
        print()
    except Exception as e:
        print(f"❌ Invalid GitHub token: {e}")
        sys.exit(1)

    # Fetch PocketBase records
    records = fetch_pocketbase_records()

    if not records:
        print("No records found to migrate")
        sys.exit(0)

    print()
    confirm = input(
        f"Ready to migrate {len(records)} records to GitHub Gists? (yes/no): "
    )
    if confirm.lower() != "yes":
        print("Migration cancelled")
        sys.exit(0)

    print()
    print("🚀 Starting migration...")
    print("-" * 60)

    # Migrate records
    mappings = []
    success_count = 0
    fail_count = 0

    for i, record in enumerate(records, 1):
        print(f"\n[{i}/{len(records)}] Migrating: {record.get('title', 'Untitled')}")

        result = create_gist(record, github_token)

        if result:
            mappings.append(result)
            success_count += 1
        else:
            fail_count += 1

        # Rate limiting - GitHub allows 5000 requests per hour
        # But let's be nice and add a small delay
        time.sleep(1)

    print()
    print("=" * 60)
    print("Migration Complete!")
    print("=" * 60)
    print(f"✅ Successfully migrated: {success_count}")
    print(f"❌ Failed: {fail_count}")
    print()

    # Save migration log
    save_migration_log(mappings)

    print()
    print("Next steps:")
    print("1. Review migration_log.json for ID mappings")
    print("2. Test accessing some migrated gists via the app")
    print("3. Update any bookmarks or shared links with new gist IDs")
    print()


if __name__ == "__main__":
    main()
