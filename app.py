import streamlit as st

st.set_page_config(
    page_title="Top Shelf Analytics",
    layout="wide",
    initial_sidebar_state="expanded"
)

bios_page = st.Page("pages/1_Skater_Bios.py", title="Skater Bios")
summary_page = st.Page("pages/2_Skater_Summary.py", title="Skater Summary")
faceoff_pct_page = st.Page("pages/3_Skater_Faceoff_Percentages.py", title="Faceoff Percentages")
faceoff_wins_page = st.Page("pages/4_Skater_Faceoff_Wins.py", title="Faceoff Wins")
goals_for_against_page = st.Page("pages/5_Skater_GoalsForAgainst.py", title="Goals For / Against")
penalties_page = st.Page("pages/6_Skater_Penalties.py", title="Penalties")
penalty_kill_page = st.Page("pages/7_Skater_PenaltyKill.py", title="Penalty Kill")

pg = st.navigation(
    [
        summary_page,
        bios_page,
        faceoff_pct_page,
        faceoff_wins_page,
        goals_for_against_page,
        penalties_page,
        penalty_kill_page,
    ],
    position="top",
)

pg.run()