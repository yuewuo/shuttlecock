import os, re

class PersonBest:
    def __init__(self, classname, name):
        self.classname = classname
        self.name = name
        self.best_duration = 0
        self.best_date = None
        self.best_count = 0

def main():
    classes = ["class1", "class2", "class3", "class4", "class5", "class6", "grad"]
    best_persons = []
    best_count_persons = []
    for classname in classes:
        table = buildtable(classname)
        for row in table[1:]:
            if len(row) < 1:
                continue
            name = row[0]
            person_best = PersonBest(classname, name)
            count_person_best = PersonBest(classname, name)
            for i in range(1, len(row)):
                val = row[i]
                if val == "":
                    continue
                all_val = re.findall(r"[0-9]+", val)
                assert(len(all_val) == 3)
                val0 = int(all_val[0])
                val1 = int(all_val[1])
                count = int(all_val[2])
                if val0 > person_best.best_duration:
                    person_best.best_duration = val0
                    person_best.best_date = table[0][i]
                if val1 > person_best.best_duration:
                    person_best.best_duration = val1
                    person_best.best_date = table[0][i]
                if count > count_person_best.best_count:
                    count_person_best.best_count = count
                    count_person_best.best_date = table[0][i]
            # print(classname, name, person_best.best_duration, person_best.best_date)
            best_persons.append(person_best)
            best_count_persons.append(count_person_best)
        # exit(0)
    best_persons.sort(key = lambda x: -x.best_duration)
    best_count_persons.sort(key = lambda x: -x.best_count)
    print("best duration")
    for i in range(10):
        person_best = best_persons[i]
        print(person_best.classname, person_best.name, person_best.best_duration, person_best.best_date)
    print("best count")
    for i in range(10):
        count_person_best = best_count_persons[i]
        print(count_person_best.classname, count_person_best.name, count_person_best.best_count, count_person_best.best_date)

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
