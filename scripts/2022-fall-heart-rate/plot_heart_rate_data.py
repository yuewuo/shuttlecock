from common import *
from pathlib import Path
import json
import matplotlib.pyplot as plt
import numpy as np


fig, ax = plt.subplots()
x = [i for i in range(record_length)]

for (class_idx, (_, class_name)) in enumerate(class_names):
    class_info = class_infos[class_idx]
    for month, day, filename in class_info:
        json_filepath = Path(class_name) / (filename[:-3] + "json")
        with open(json_filepath, "r", encoding="utf8") as f:
            data = json.load(f)
            for student in data['students']:
                for truncation in student['truncations']:
                    select = True
                    if truncation[173] < 85.0:
                        select = False
                    if truncation[178] < 112:
                        select = False
                    if truncation[94] < 102:
                        select = False
                    if truncation[281] > 177:
                        select = False
                    if truncation[336] is None or truncation[336] > 163:
                        select = False
                    # only display filtered data
                    if select:
                        ax.plot(x, truncation)

plt.show()
