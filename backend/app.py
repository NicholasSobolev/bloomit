import os

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

GITHUB_API_URL = "https://api.github.com"


@app.route("/auth", methods=["GET"])
def auth():
    code = request.args.get("code")

    token_response = requests.post(
        "https://github.com/login/oauth/access_token",
        data={
            "client_id": os.getenv("GITHUB_CLIENT_ID"),
            "client_secret": os.getenv("GITHUB_CLIENT_SECRET"),
            "code": code,
            "redirect_uri": "http://localhost:5173/",
        },
        headers={"Accept": "application/json"},
    )

    print("GitHub OAuth raw response:", token_response.json())  # debug
    return jsonify(token_response.json())


@app.route("/commit_activity", methods=["GET"])
def get_commit_data():
    token = request.args.get("token")
    username = request.args.get("username")
    since = (datetime.now() - timedelta(days=30)).isoformat()

    if not token or not username:
        return jsonify({"error": "Missing token or username"}), 400

    headers = {"Authorization": f"token {token}"}

    try:
        repos_resp = requests.get(
            f"{GITHUB_API_URL}/users/{username}/repos", headers=headers
        )
        repos_resp.raise_for_status()
        repos = repos_resp.json()
    except Exception as e:
        return jsonify({"error": "Failed to fetch repos", "details": str(e)}), 500

    commit_days = set()
    total_commits = 0
    search_query_commit = f"author:{username} author-date:>={since:10}"
    try:
        page = 1
        while True:
            search_resp_commit = requests.get(
                f"{GITHUB_API_URL}/search/commits",
                headers=headers,
                params={"q": search_query_commit, "per_page": 100, "page": page},
            )
            search_resp_commit.raise_for_status()
            data = search_resp_commit.json()
            total_commits = data.get("total_count", 0)
            for item in data.get("items", []):
                commit_date = item["commit"]["author"]["date"][:10]
                commit_days.add(commit_date)
            if len(data["items"]) < 100:
                break
            page += 1
            if page > 10:  # max 1000 results
                break
    except Exception as e:
        pass

    merged_prs = 0
    search_query = f"type:pr author:{username} merged:>={since:10}"
    try:
        search_resp = requests.get(
            f"{GITHUB_API_URL}/search/issues",
            headers=headers,
            params={"q": search_query},
        )
        search_resp.raise_for_status()
        merged_prs = search_resp.json().get("total_count", 0)
    except Exception as e:
        pass

    today = datetime.now().date()
    streak = 0
    max_streak = 0

    for day in range(30, -1, -1):
        check_date = (today - timedelta(days=day)).isoformat()
        if check_date in commit_days:
            streak += 1
            max_streak = max(max_streak, streak)
        else:
            streak = 0

    return jsonify(
        {
            "streak": streak,
            "max_streak": max_streak,
            "days_with_commits": list(commit_days),
            "merged_prs": merged_prs,
            "total_commits": total_commits,
        }
    )


if __name__ == "__main__":
    app.run(debug=True)
