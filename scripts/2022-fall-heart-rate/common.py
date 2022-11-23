import re, datetime


class_names = [(f"{i}班", f"class{i}") for i in range(1, 5)]

class_infos = [
    [(9, 13, '9.13.csv'), (9, 27, '9.27.csv'), (10, 4, '10.4.csv'), (10, 18, '10.18.csv'), (10, 25, '10.25.csv'), (11, 1, '11.1.csv'), (11, 8, '11.8.csv'), (11, 15, '11.15.csv')],
    [(9, 14, '9.14.csv'), (9, 28, '9.28.csv'), (10, 5, '10.5.csv'), (10, 12, '10.12.csv'), (10, 19, '10.19.csv'), (10, 26, '10.26.csv'), (11, 2, '11.2.csv'), (11, 9, '11.9.csv')],
    [(9, 29, '9.29.csv'), (10, 6, '10.6.csv'), (10, 13, '10.13.csv'), (10, 20, '10.20.csv'), (10, 27, '10.27.csv'), (11, 3, '11.3.csv'), (11, 10, '11.10.csv')],
    [(9, 16, '9.16.csv'), (9, 30, '9.30.csv'), (10, 7, '10.7.csv'), (10, 14, '10.14.csv'), (10, 21, '10.21.csv'), (10, 28, '10.28.csv'), (11, 4, '11.4.csv'), (11, 11, '11.11.csv')]
]

class StudentData:
    def __init__(self, class_time, student_name) -> None:
        self.class_time = class_time  # e.g. 2022.09.13 11:15:24 -  11:41:26
        self.student_name = student_name  # e.g. 李向阳2
        z = re.match("^([^\d]+)(\d+)$", student_name)
        groups = z.groups()
        self.name = groups[0]  # e.g. 李向阳
        self.index = int(groups[1])  # e.g. 2
        self.data = []
        self.last_event_time = None
        self.truncations = []
    def append_data(self, timestamp: str, heart_rate: int):
        event_time = datetime.datetime.strptime(timestamp, "%H:%M:%S")
        if self.last_event_time is not None:
            if self.last_event_time == event_time:
                # print(f"[warning] duplicate time {timestamp}, previous: {self.data[-1][1]}, now: {heart_rate}")
                return
            supposed_time = self.last_event_time + datetime.timedelta(seconds=1)
            if supposed_time + datetime.timedelta(seconds=1) == event_time:
                # print(f"[warning] missing time {supposed_time}, previous: {self.data[-1][1]}, now: {heart_rate}")
                missing_heart_rate = (self.data[-1][1] + heart_rate) / 2
                missing_timestamp = supposed_time.strftime("%H:%M:%S")
                self.data.append((missing_timestamp, missing_heart_rate))
                # self.data.append((timestamp, heart_rate))
                supposed_time = event_time
            if supposed_time != event_time:
                # it happens rarely (only 3 times) that event_time = last_event_time - 1; ok to ignore
                if event_time + datetime.timedelta(seconds=1) == self.last_event_time:
                    return
                print(f"[error] previous: {self.data[-1][0]}, now: {timestamp}")
                exit(1)
        self.last_event_time = event_time
        self.data.append((timestamp, heart_rate))
    def sanity_check(self):
        last_event_time = None
        for timestamp, _ in self.data:
            event_time = datetime.datetime.strptime(timestamp, "%H:%M:%S")
            if last_event_time is not None:
                assert last_event_time + datetime.timedelta(seconds=1) == event_time
            last_event_time = event_time
    def min_max_time(self):
        return (datetime.datetime.strptime(self.data[0][0], "%H:%M:%S"), datetime.datetime.strptime(self.data[-1][0], "%H:%M:%S"))
    def align_with(self, min_time, max_time):
        first_time = datetime.datetime.strptime(self.data[0][0], "%H:%M:%S")
        last_time = datetime.datetime.strptime(self.data[-1][0], "%H:%M:%S")
        bias = round((first_time - min_time).total_seconds())
        padding = round((max_time - last_time).total_seconds())
        self.aligned = ([None] * bias) + [e[1] for e in self.data] + ([None] * padding)
    def record_truncation(self, start, length):
        truncation = self.aligned[start:start+length]
        assert len(truncation) != 0
        while len(truncation) < length:
            truncation.append(None)
        self.truncations.append(truncation)
    def get_truncation_auto_padding(self, start, length):
        truncation = self.aligned[start:start+length]
        assert len(truncation) != 0
        padding_front = 0
        for i in range(len(truncation)):
            if truncation[i] is None:
                padding_front += 1
            else:
                break
        if padding_front == len(truncation):
            return None # found truncation all None, just ignore this missing data
        for i in range(padding_front):
            truncation[i] = truncation[padding_front]
        padding_behind = 0
        for i in range(1, len(truncation)):
            if truncation[-i] is None:
                padding_behind += 1
            else:
                break
        for i in range(1, padding_behind+1):
            truncation[-i] = truncation[-padding_behind-1]
        while len(truncation) < length:
            truncation.append(truncation[-1])
        return truncation
    def __repr__(self) -> str:
        return f"StudentData({self.name}, {self.index})"

class OriginalData:
    def __init__(self, filepath) -> None:
        with open(filepath, "r", encoding="utf8") as f:
            lines = f.read().split("\n")
        assert lines[0].startswith("课堂名称,")
        assert lines[0].endswith(",时间,原始心率")
        self.class_name = lines[0].split(",")[1]  # e.g. 1班周二34节
        student_data = None
        self.students = []
        for idx in range(1, len(lines)):
            if lines[idx] == "":
                continue
            if lines[idx].startswith("上课时间,"):
                student_data = StudentData(lines[idx].split(",")[1], lines[idx+1].split(",")[1])
                self.students.append(student_data)
            spt = lines[idx].split(",")
            assert len(spt) == 4
            timestamp = spt[2]
            heart_rate = int(spt[3])
            student_data.append_data(timestamp, heart_rate)
        self.students.sort(key=lambda x: x.index)
        # print(self.students)
        self.min_time = None
        self.max_time = None
        for student in self.students:
            student.sanity_check()
            min_time, max_time = student.min_max_time()
            if self.min_time is None:
                self.min_time = min_time
                self.max_time = max_time
            self.min_time = min(min_time, self.min_time)
            self.max_time = max(max_time, self.max_time)
        self.duration = round((self.max_time - self.min_time).total_seconds())
        # print(self.min_time, self.max_time)
        for student in self.students:
            student.align_with(self.min_time, self.max_time)
