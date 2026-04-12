from pathlib import Path
import streamlit as st
import pandas as pd

st.set_page_config(page_title="Top Shelf Analytics", layout="wide")

BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "skater_summary.csv"

@st.cache_data
def load_data():
    if not CSV_PATH.exists():
        st.error(f"CSV not found: {CSV_PATH.name}")
        st.stop()

    file_size = CSV_PATH.stat().st_size
    if file_size == 0:
        st.error(f"{CSV_PATH.name} is empty (0 bytes).")
        st.stop()

    try:
        return pd.read_csv(CSV_PATH)
    except pd.errors.EmptyDataError:
        st.error(f"{CSV_PATH.name} was found, but pandas says it contains no readable data.")
        st.stop()
    except Exception as e:
        st.error(f"Could not read {CSV_PATH.name}: {e}")
        st.stop()

df = load_data()

st.title("Top Shelf Analytics")
st.subheader("Skater Summary")

st.sidebar.header("Filters")
filtered_df = df.copy()

if "teamAbbrev" in filtered_df.columns:
    teams = sorted(filtered_df["teamAbbrev"].dropna().astype(str).unique().tolist())
    selected_teams = st.sidebar.multiselect("Team", teams)
    if selected_teams:
        filtered_df = filtered_df[filtered_df["teamAbbrev"].astype(str).isin(selected_teams)]

if "skaterFullName" in filtered_df.columns:
    search = st.sidebar.text_input("Search player")
    if search:
        filtered_df = filtered_df[
            filtered_df["skaterFullName"].astype(str).str.contains(search, case=False, na=False)
        ]

if "summary_shots" in filtered_df.columns:
    shots_numeric = pd.to_numeric(filtered_df["summary_shots"], errors="coerce")
    min_val = int(shots_numeric.min()) if shots_numeric.notna().any() else 0
    max_val = int(shots_numeric.max()) if shots_numeric.notna().any() else 0
    min_shots = st.sidebar.slider("Minimum shots", min_val, max_val, min_val)
    filtered_df = filtered_df[shots_numeric >= min_shots]

row_limit = st.sidebar.selectbox("Rows to display", [25, 50, 100, 250, 500, 1000], index=2)

st.write(f"Showing {min(len(filtered_df), row_limit):,} of {len(filtered_df):,} rows")
st.dataframe(filtered_df.head(row_limit), use_container_width=True, hide_index=True)

st.download_button(
    "Download filtered data",
    filtered_df.to_csv(index=False),
    "filtered_skater_data.csv",
    "text/csv",
)