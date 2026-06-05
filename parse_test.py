import datetime
from datetime import date

def parse_date(d):
    if not d:
        return None
    if isinstance(d, str):
        return date.fromisoformat(d.split('T')[0])
    return d

print(parse_date("2026-06-01"))
