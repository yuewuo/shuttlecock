from common import *
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
import json


skip_found = False
display_all = False
if display_all:
    skip_found = False
export_file = True

points = {
    "class1/9.13.csv": ["single", False, 150],
    "class1/9.27.csv": ["grouped", False, 100, 410],
    "class1/10.4.csv": ["grouped", False, 160, 430],
    "class1/10.18.csv": ["grouped", False, 260, 623, 1520, 1806],
    "class1/10.25.csv": ["grouped", False, 120, 410, 866, 1162],
    "class1/11.1.csv": ["grouped", False, 75, 327, 1328, 1584],
    "class1/11.8.csv": ["grouped", False, 13, 262, 1162, 1387],
    "class1/11.15.csv": ["grouped", False, 23, 315, 1021, 1288],
    "class2/9.14.csv": ["single", False, 870],
    "class2/9.28.csv": ["grouped", False, 129, 537],
    "class2/10.5.csv": ["grouped", False, 263, 555],
    "class2/10.12.csv": ["grouped", False, 115, 428],
    "class2/10.19.csv": ["grouped", False, 28, 382, 1287, 1621],
    "class2/10.26.csv": ["grouped", False, 85, 379, 930, 1209],
    "class2/11.2.csv": ["grouped", False, 8, 288, 1478, 1732],
    "class2/11.9.csv": ["grouped", False, 172, 456, 1290, 1528],
    "class3/9.29.csv": ["grouped", False, 311, 698],
    "class3/10.6.csv": ["grouped", False, 111, 413],
    "class3/10.13.csv": ["grouped", False, 129, 415],
    "class3/10.20.csv": ["grouped", False, 218, 486, 1667, 1923],
    "class3/10.27.csv": ["grouped", False, 176, 426, 1478, 1700],
    "class3/11.3.csv": ["grouped", False, 954, 1268],
    "class3/11.10.csv": ["grouped", False, 189, 444, 1440, 1692],
    "class4/9.16.csv": ["single", False, 46],
    "class4/9.30.csv": ["grouped", False, 18, 397],
    "class4/10.7.csv": ["grouped", False, 123, 401],
    "class4/10.14.csv": ["single", False, 157],
    "class4/10.21.csv": ["grouped", False, 0, 304, 1574, 1876],
    "class4/10.28.csv": ["grouped", False, 18, 335, 1091, 1349],
    "class4/11.4.csv": ["grouped", False, 55, 317, 1524, 1766],
    "class4/11.11.csv": ["grouped", False, 82, 318, 1326, 1590],
}

if display_all:
    x = [i for i in range(record_length)]
    fig, ax = plt.subplots()

for (class_idx, (_, class_name)) in enumerate(class_names):
    class_info = class_infos[class_idx]
    for month, day, filename in class_info:
        key = str(Path(class_name) / filename)
        if skip_found and key in points and points[key][1] == False:
            continue
        print(key)
        original_data = OriginalData(Path(class_name) / filename)
        if key in points:
            strategy, display, *args = points[key]
            if strategy == "single":
                starting = args[0]
                for student in original_data.students:
                    student.record_truncation(starting, record_length)
            elif strategy == "grouped":
                assert len(args) % 2 == 0
                for i in range(len(args) // 2):
                    start_1 = args[0 + 2*i]
                    start_2 = args[1 + 2*i]
                    for student in original_data.students:
                        # use variance to determine which group they belong to
                        trunc_1 = student.get_truncation_auto_padding(start_1, record_length)
                        trunc_2 = student.get_truncation_auto_padding(start_2, record_length)
                        if trunc_1 is not None and trunc_2 is not None:
                            # var1 = np.var(np.array(trunc_1))
                            # var2 = np.var(np.array(trunc_2))
                            # avr = np.mean(np.array([heart_rate for _, heart_rate in student.data]))
                            # var1 = np.mean((np.array(trunc_1) - avr) ** 2)
                            # var2 = np.mean((np.array(trunc_2) - avr) ** 2)
                            var1 = np.mean(np.array(trunc_1))
                            var2 = np.mean(np.array(trunc_2))
                            # print(var1, var2)
                            student.record_truncation(start_1 if var1 > var2 else start_2, record_length)
            else:
                raise "strategy not implemented"
            if display:
                x = [i for i in range(record_length)]
                fig, ax = plt.subplots()
                for student in original_data.students:
                    for truncation in student.truncations:
                        ax.plot(x, truncation)
                plt.show()
                exit(0)
            if display_all:
                for student in original_data.students:
                    for truncation in student.truncations:
                        ax.plot(x, truncation)
            if export_file:
                export_data = original_data.__dict__
                export_data_students = []
                for student in export_data['students']:
                    data = student.__dict__
                    del data['data']
                    del data['aligned']
                    del data['last_event_time']
                    export_data_students.append(data)
                export_data['students'] = export_data_students
                del export_data['min_time']
                del export_data['max_time']
                json_str = json.dumps(export_data, ensure_ascii=False)
                with open(Path(class_name) / (filename[:-3] + "json"), "w", encoding="utf8") as f:
                    f.write(json_str)
        else:
            x = [i for i in range(original_data.duration + 1)]
            fig, ax = plt.subplots()
            for student in original_data.students:
                ax.plot(x, student.aligned)
            plt.show()
            exit(0)

if display_all:
    plt.show()
