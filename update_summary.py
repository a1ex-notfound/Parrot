import sqlite3
import json
import os

db_path = os.path.join("backend", "meetings.db")
if not os.path.exists(db_path):
    db_path = "meetings.db"

analysis = {
    "executive_summary": "In this celebratory interview, Lisa discusses the record-breaking global launch of her single 'Sawadika', which amassed over 70 million YouTube views in 24 hours and hit #1 on Spotify Global and iTunes worldwide. The discussion explores her upcoming cinematic EP reflecting her Thai roots, her celebrated documentary and acting debut in 'The White Lotus', her sold-out 4-night Las Vegas residency ('Viva Lalisa'), and concludes with an interactive Thai cooking segment preparing Som Tam with a custom soju cocktail.",
    "key_takeaways": [
        "Lead single 'Sawadika' achieved record-breaking milestones: 70M+ YouTube views in 24 hours, #1 on Spotify Global, and #1 on iTunes worldwide charts.",
        "Upcoming EP releasing next month represents her journey from Thai roots to global stardom, structured like a cohesive movie experience.",
        "Track 4 (title starting with the letter 'T') confirmed as the next promotional single from the EP.",
        "Historic achievement as the first K-pop artist with a Las Vegas residency ('Viva Lalisa') selling out all 4 dates within minutes.",
        "Cultural showcase explaining Thai gender-based greetings (Sawadika vs Sawadikrapp) and traditional preparation of Som Tam papaya salad."
    ],
    "action_items": [
        {
            "task": "Commence stage design and choreography rehearsals for the 4-show Las Vegas residency",
            "owner": "Lisa & Production Team",
            "deadline": "November",
            "priority": "High"
        },
        {
            "task": "Prepare promotional reveal and music video rollout for Track 4 single",
            "owner": "Management Team",
            "deadline": "Next Month",
            "priority": "High"
        },
        {
            "task": "Coordinate full tracklist reveal on Apple Music prior to EP debut",
            "owner": "Label Operations",
            "deadline": "Next Month",
            "priority": "Medium"
        }
    ],
    "key_decisions": [
        "Track 4 selected as the next official single leading into the EP release.",
        "A 4-show residency format confirmed for 'Viva Lalisa' in Las Vegas this November.",
        "Cinematic narrative structure adopted for the EP, blending authentic Thai instrumentation with modern pop."
    ],
    "agreed_next_steps": [
        "Initiate full production rehearsals for the Vegas residency.",
        "Launch fan guessing campaign for mystery titles on the EP tracklist.",
        "Host and guest agreed to greet each other in Thai for the next interview appearance."
    ],
    "speaker_analytics": [
        {
            "speaker": "Speaker 1 (Host)",
            "talk_percentage": 47,
            "sentiment": "Enthusiastic & Celebratory"
        },
        {
            "speaker": "Speaker 2 (Lisa)",
            "talk_percentage": 53,
            "sentiment": "Grateful & Expressive"
        }
    ]
}

conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("UPDATE meetings SET summary_json = ? WHERE title = 'test' OR title LIKE '%test%'", (json.dumps(analysis),))
conn.commit()
print(f"\n>>> Updated {c.rowcount} meeting(s) with accurate interview intelligence!\n")
conn.close()
