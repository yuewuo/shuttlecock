import os, re, shutil
from pathlib import Path
import pandas as pd


class_names = [(f"{i}班", f"class{i}") for i in range(1, 5)]

def distillate_filename(filename):
    z = re.match("^(\d+)(月|\.)(\d+)(日|号)?(具体)?.xls$", filename)
    if z:
        groups = z.groups()
        month = int(groups[0])
        day = int(groups[2])
        return (month, day, filename)
    # if filename 
    raise "unrecognized"

for (class_name, new_class_name) in class_names:
    folder_path = Path(class_name)
    filenames = os.listdir(folder_path)
    distilled = [distillate_filename(filename) for filename in filenames]
    distilled.sort(key = lambda x: x[0] * 31 + x[1])
    print(distilled)
    new_folder_path = Path(new_class_name)
    if new_folder_path.exists():
        shutil.rmtree(new_folder_path)
    os.mkdir(new_folder_path)
    for month, day, filename in distilled:
        read_file = pd.read_excel(folder_path / filename, sheet_name=None)
        df = pd.concat(read_file, ignore_index=True)
        df.to_csv(new_folder_path / f"{month}.{day}.csv", index = None, header=True)
