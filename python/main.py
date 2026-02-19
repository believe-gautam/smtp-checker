import csv
import os
import sys
import math

def split_csv(input_file, rows_per_file=1000):
    base_name = os.path.splitext(os.path.basename(input_file))[0]
    output_dir = os.path.dirname(os.path.abspath(input_file))

    with open(input_file, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = list(reader)

    total_rows = len(rows)
    total_files = math.ceil(total_rows / rows_per_file)

    if total_files == 0:
        print("No data rows found in the file.")
        return

    padding = len(str(total_files))

    for i in range(total_files):
        chunk = rows[i * rows_per_file : (i + 1) * rows_per_file]
        output_file = os.path.join(output_dir, f"{base_name}_part_{str(i + 1).zfill(padding)}.csv")

        with open(output_file, newline='', encoding='utf-8', mode='w') as f:
            writer = csv.writer(f)
            writer.writerow(header)
            writer.writerows(chunk)

        print(f"Created: {output_file}  ({len(chunk)} rows)")

    print(f"\nDone! Split {total_rows} rows into {total_files} file(s).")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python split_csv.py <input_file.csv> [rows_per_file]")
        print("Example: python split_csv.py contacts.csv 1000")
        sys.exit(1)

    input_file = sys.argv[1]
    rows_per_file = int(sys.argv[2]) if len(sys.argv) > 2 else 1000

    if not os.path.exists(input_file):
        print(f"Error: File '{input_file}' not found.")
        sys.exit(1)

    split_csv(input_file, rows_per_file)