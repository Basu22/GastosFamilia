import pandas as pd
import re
import numpy as np

URL = "https://docs.google.com/spreadsheets/d/1k_ZysyqTS46NXdKBKGxlmg46t20OOtlCA2Bbzx0e1Yk/export?format=xlsx"
sheets = pd.read_excel(URL, sheet_name=None)
df = sheets['MOVIMIENTOS']
matrix = df.values.tolist()

def clean(v):
    if pd.isna(v): return 0
    if isinstance(v, (int, float)): return float(v)
    s = str(v).replace('.', '').replace(',', '.')
    cleaned = re.sub(r'[^\d.]', '', s)
    try:
        return float(cleaned)
    except:
        return 0

total40 = 0
items = []
current_group = ""

for row in matrix[9:]:
    label = str(row[1]).strip()
    if label in ["BASO VISA", "JULI VISA", "JULI MASTER", "JULI CENCOSUD", "SELE SANTANDER", "MONI GALICIA", "BASO MASTER", "JULI BBVA", "BASO ICBC"]:
        current_group = label
        continue
    
    if "TOTAL" in label or "GASTOS" in label or label == "MOVIMIENTOS" or label == "nan":
        continue
    
    v = clean(row[40])
    if v > 0 and current_group:
        total40 += v
        items.append((current_group, label, v))

print(f"Total Column 40 (Cards only): {total40}")
print("Top 10 items:")
for g, l, v in sorted(items, key=lambda x: x[2], reverse=True)[:10]:
    print(f"{g} - {l}: {v}")
