"""Backend smoke tests for EcoState simulation engine."""
from models import GameState, RegionType
from simulation_engine import (
    MAX_LEVEL, MAX_AGGRAVATION, SUCCESS_AVG, MISS_AVG,
    load_scenario, evaluate_submission,
    pick_scenario_for_level, valid_scenarios_by_tier, scenario_tier_for_level,
    average_distance, RESET_VALUE,
)
from scenarios import SCENARIOS

TROPICAL = RegionType.TROPICAL
MOON = RegionType.MOON
OCEAN = RegionType.OCEAN


def fresh_state(region=TROPICAL):
    return GameState(session_id="test", region=region, level=0)


def main():
    # ── Tier distribution ────────────────────────────────────────────────────
    print("=== Tier distribution ===")
    pools_t = valid_scenarios_by_tier(TROPICAL)
    for tier in [1, 2, 3, 4]:
        print(f"  Tier {tier}: {len(pools_t.get(tier, []))} scenarios")

    # ── Level 0 scenario ─────────────────────────────────────────────────────
    print()
    print("=== Level 0 scenario for TROPICAL ===")
    sc0 = pick_scenario_for_level(0, TROPICAL)
    print(f"  {sc0['id']} (tier {sc0['tier']})")

    # ── Tier-per-level mapping ───────────────────────────────────────────────
    print()
    print("=== Tier-per-level mapping ===")
    # Level 0-2→T1, 3-5→T2, 6-8→T3, 9→T4
    expected = {1: 1, 2: 1, 3: 2, 5: 2, 6: 3, 8: 3, 9: 4}
    for lvl, exp_tier in expected.items():
        got = scenario_tier_for_level(lvl)
        assert got == exp_tier, f"Level {lvl}: expected tier {exp_tier}, got {got}"
        sc = pick_scenario_for_level(lvl, TROPICAL)
        print(f"  Level {lvl:2d} -> Tier {got}: {sc['id']}")
    print("  Tier-per-level: OK")

    # ── Game-over logic ──────────────────────────────────────────────────────
    print()
    print("=== Game-over logic (agg=2 -> fail -> game_over) ===")
    st3 = fresh_state(TROPICAL)
    load_scenario(st3, 0, MAX_AGGRAVATION)
    print(f"  Scenario: {st3.scenario_id} (agg={st3.aggravation})")
    avg = average_distance(st3.vectors, st3.targets)
    print(f"  avg_dist (vectors at neutral 0) = {avg:.2f}  (need > {MISS_AVG} for fail)")
    assert avg > MISS_AVG, f"avg_dist {avg:.2f} not > MISS_AVG {MISS_AVG}; fix average_distance denominator!"
    evaluate_submission(st3)
    print(f"  After submit: is_game_over={st3.is_game_over}, last_result={st3.last_result}")
    assert st3.is_game_over, f"expected game_over=True, got agg={st3.aggravation} result={st3.last_result}"
    print("  game-over: PASS")

    # ── Success path ─────────────────────────────────────────────────────────
    print()
    print("=== Success path (vectors at target -> level+1) ===")
    st_ok = fresh_state(TROPICAL)
    load_scenario(st_ok, 0, 0)
    for k, t in st_ok.targets.items():
        st_ok.vectors[k].value = t
    st_ok.supply_pool = 999
    evaluate_submission(st_ok)
    assert st_ok.last_result == "success", f"expected success, got {st_ok.last_result}"
    assert st_ok.level == 1, f"expected level 1, got {st_ok.level}"
    print(f"  Level advanced to {st_ok.level}: PASS")

    # ── Miss path ────────────────────────────────────────────────────────────
    print()
    print("=== Miss path (slight deviation -> miss -> aggravation++) ===")
    st_miss = fresh_state(TROPICAL)
    load_scenario(st_miss, 0, 0)
    for k, t in st_miss.targets.items():
        if abs(t - RESET_VALUE) > 0.1:
            st_miss.vectors[k].value = t + 9
    st_miss.supply_pool = 999
    prev_agg = st_miss.aggravation
    evaluate_submission(st_miss)
    print(f"  result={st_miss.last_result}, agg: {prev_agg} -> {st_miss.aggravation}")

    # ── strict_keys ──────────────────────────────────────────────────────────
    print()
    print("=== strict_keys ===")
    sc_strict = next((s for s in SCENARIOS if s.get("strict_keys")), None)
    assert sc_strict, "No scenario with strict_keys found!"
    print(f"  First with strict_keys: {sc_strict['id']} -> {sc_strict['strict_keys']}")
    print("  strict_keys: OK")

    # ── Moon/Mars space vectors ──────────────────────────────────────────────
    print()
    print("=== Moon vectors (oxygen + pressure present) ===")
    st_m = fresh_state(MOON)
    load_scenario(st_m, 0, 0)
    print(f"  {sorted(st_m.vectors.keys())}")
    assert "oxygen" in st_m.vectors, "oxygen missing from Moon"
    assert "pressure" in st_m.vectors, "pressure missing from Moon"
    print("  oxygen + pressure on Moon: PASS")

    # ── Tropical lacks space vectors ─────────────────────────────────────────
    st_t2 = fresh_state(TROPICAL)
    load_scenario(st_t2, 0, 0)
    assert "oxygen" not in st_t2.vectors, "oxygen should NOT be in Tropical"
    assert "pressure" not in st_t2.vectors, "pressure should NOT be in Tropical"
    print("  oxygen + pressure absent from Tropical: PASS")

    # ── Supply is multiple of 5 ──────────────────────────────────────────────
    print()
    print("=== Supply budget is multiple of 5 ===")
    for lvl in range(1, 10):
        st_s = fresh_state(TROPICAL)
        load_scenario(st_s, lvl, 0)
        assert st_s.supply_budget % 5 == 0, f"supply {st_s.supply_budget} not multiple of 5 at level {lvl}"
    print("  supply multiples of 5 (levels 1-9): PASS")

    # ── MAX_LEVEL boundary ───────────────────────────────────────────────────
    print()
    print("=== Victory at MAX_LEVEL ===")
    st_v = fresh_state(TROPICAL)
    load_scenario(st_v, MAX_LEVEL - 1, 0)  # load boss scenario (level 9)
    st_v.level = MAX_LEVEL - 1
    for k, t in st_v.targets.items():
        st_v.vectors[k].value = t
    st_v.supply_pool = 999
    evaluate_submission(st_v)
    assert st_v.is_victory, f"expected is_victory at level {MAX_LEVEL}, got {st_v.level}"
    print(f"  is_victory at level {MAX_LEVEL}: PASS")

    # ── Ocean has salinidade; Tropical does not ──────────────────────────────
    print()
    print("=== Ocean vectors (salinidade present) ===")
    st_oc = fresh_state(OCEAN)
    load_scenario(st_oc, 0, 0)
    print(f"  {sorted(st_oc.vectors.keys())}")
    assert "salinidade" in st_oc.vectors, "salinidade missing from Ocean"
    print("  salinidade on Ocean: PASS")

    st_t3 = fresh_state(TROPICAL)
    load_scenario(st_t3, 0, 0)
    assert "salinidade" not in st_t3.vectors, "salinidade should NOT be in Tropical"
    print("  salinidade absent from Tropical: PASS")

    # ── Ocean pool includes ocean-exclusive scenarios ─────────────────────────
    oc_pools = valid_scenarios_by_tier(OCEAN)
    ocean_exclusive = [s for tier in oc_pools.values() for s in tier if s.get("regions") == ["ocean"]]
    assert ocean_exclusive, "No ocean-exclusive scenarios found in pool!"
    print(f"  Ocean-exclusive scenarios: {len(ocean_exclusive)} — PASS")

    # ── Tropical pool excludes ocean-exclusive scenarios ─────────────────────
    tr_pools = valid_scenarios_by_tier(TROPICAL)
    tr_flat = [s for tier in tr_pools.values() for s in tier]
    tr_ocean_excl = [s for s in tr_flat if s.get("regions") == ["ocean"]]
    assert not tr_ocean_excl, f"Ocean-exclusive scenario in Tropical pool: {[s['id'] for s in tr_ocean_excl]}"
    print("  Ocean-exclusive scenarios excluded from Tropical: PASS")

    # ── Randomization: two calls for same level can differ ────────────────────
    print()
    print("=== Randomization ===")
    seen_ids = {pick_scenario_for_level(0, TROPICAL)["id"] for _ in range(20)}
    pool_t1 = valid_scenarios_by_tier(TROPICAL).get(1, [])
    if len(pool_t1) > 1:
        assert len(seen_ids) > 1, "pick_scenario_for_level returned same scenario 20 times — randomization broken"
        print(f"  Got {len(seen_ids)} distinct T1 scenarios across 20 picks: PASS")
    else:
        print("  Only 1 T1 scenario in pool — skip randomization variation check")

    # No immediate repeat when exclude_id is set
    first = pick_scenario_for_level(0, TROPICAL)["id"]
    repeats = sum(1 for _ in range(30) if pick_scenario_for_level(0, TROPICAL, exclude_id=first)["id"] == first)
    if len(pool_t1) > 1:
        assert repeats < 30, "exclude_id had no effect — all 30 picks matched the excluded scenario"
        print(f"  exclude_id reduced repeats to {repeats}/30: PASS")

    # ── Total scenario count ──────────────────────────────────────────────────
    print()
    print("=== Scenario count ===")
    print(f"  Total scenarios: {len(SCENARIOS)}")
    assert len(SCENARIOS) >= 50, f"Expected >=50 scenarios, got {len(SCENARIOS)}"
    print(f"  >=50 scenarios: PASS")

    print()
    print("=== ALL TESTS PASSED ===")


if __name__ == "__main__":
    main()
