import os, re

history_data_path = "../history_data"

def main():
    for term in os.listdir(history_data_path):
        if term.endswith(".DS_Store"):
            continue
        # print(f"analyzing term {term}...")
        classes_csv = os.listdir(os.path.join(history_data_path, term))
        person_count = 0
        tick_sum = 0

        for class_csv in classes_csv:
            class_csv_path = os.path.join(history_data_path, term, class_csv)
            class_name = class_csv.split(".")[0]
            # print(class_name)
            table = buildtable(class_name, csvname = class_csv_path)
            for row in table[1:]:
                if len(row) < 1:
                    continue
                name = row[0]
                person_count += 1
                for i in range(1, len(row)):
                    val = row[i]
                    if val == "":
                        continue
                    all_val = re.findall(r"[0-9]+", val)
                    assert(len(all_val) == 3 or len(all_val) == 2)
                    if len(all_val) == 3:
                        count = int(all_val[2])
                        tick_sum += count
        print(f"{term} 人数={person_count}，踢毽子总数={tick_sum}，人均={tick_sum/person_count}")




def buildtable(classname, csvname = None):
    csvcontent = ""
    if csvname is None:
        csvname = "%s.csv" % classname
    with open(csvname, "r", encoding="gb18030") as f:
        csvcontent = f.read()
    # print(csvcontent)
    csvsp1 = csvcontent.split('\n')
    table = []
    for ele in csvsp1:
        sp2 = ele.split(',')
        if len(sp2) > 1:
            table.append(sp2)
    return table

if __name__ == "__main__":
    main()
