import sys
import json
import random
from collections import defaultdict


def read_input():
    try:
        raw = sys.stdin.read()
        return json.loads(raw)
    except Exception as e:
        print(json.dumps({"error": f"Failed to parse input JSON: {e}"}))
        sys.exit(1)


def main():
    payload = read_input()

    teachers = payload.get("teachers", [])
    subjects = payload.get("subjects", [])
    streams = payload.get("streams", [])
    periods = payload.get("periods", [])
    teacher_subjects = payload.get("teacher_subjects", [])

    if not teachers or not subjects or not streams or not periods:
        print(
            json.dumps(
                {
                    "error": "Missing required data in Python generator: teachers, subjects, streams or periods."
                }
            )
        )
        sys.exit(1)

    # Map teacher -> allowed subject ids
    teacher_allowed_subjects = defaultdict(list)
    for ts in teacher_subjects:
        teacher_allowed_subjects[str(ts["teacher_id"])].append(str(ts["subject_id"]))

    # If a teacher has no explicit mapping, allow all subjects as a fallback
    all_subject_ids = [str(s["id"]) for s in subjects]
    for t in teachers:
        tid = str(t["id"])
        if tid not in teacher_allowed_subjects or not teacher_allowed_subjects[tid]:
            teacher_allowed_subjects[tid] = list(all_subject_ids)

    # Simple greedy scheduler: for each period & stream, choose a subject and a teacher
    # Constraints:
    #  - A teacher cannot be double-booked in the same period/day_of_week
    #  - We try to rotate subjects per stream for basic variety

    teacher_busy = defaultdict(set)  # (day_of_week, period_id) -> teacher_id set
    last_subject_for_stream = {}  # stream_id -> last subject_id

    entries = []

    # sort periods by day_of_week then period_number for deterministic output
    periods_sorted = sorted(
        periods, key=lambda p: (p.get("day_of_week", 0), p.get("period_number", 0))
    )

    subject_cycle = list(all_subject_ids)

    for period in periods_sorted:
        day = int(period.get("day_of_week", 0))
        period_id = str(period["id"])

        for stream in streams:
            stream_id = str(stream["id"])

            # pick a subject, avoiding repeating the last subject for this stream if possible
            random.shuffle(subject_cycle)
            chosen_subject_id = None
            for sid in subject_cycle:
                if last_subject_for_stream.get(stream_id) == sid:
                    continue
                chosen_subject_id = sid
                break

            if not chosen_subject_id:
                chosen_subject_id = random.choice(subject_cycle)

            # pick a teacher who can teach this subject and is not busy in this slot
            available_teachers = []
            for t in teachers:
                tid = str(t["id"])
                if chosen_subject_id in teacher_allowed_subjects.get(tid, []):
                    if tid not in teacher_busy[(day, period_id)]:
                        available_teachers.append(tid)

            if not available_teachers:
                # cannot schedule this slot, skip it
                continue

            chosen_teacher_id = random.choice(available_teachers)
            teacher_busy[(day, period_id)].add(chosen_teacher_id)
            last_subject_for_stream[stream_id] = chosen_subject_id

            entries.append(
                {
                    "period_id": period_id,
                    "stream_id": stream_id,
                    "subject_id": chosen_subject_id,
                    "teacher_id": chosen_teacher_id,
                    "day_of_week": day,
                }
            )

    print(json.dumps({"entries": entries}))


if __name__ == "__main__":
    main()


