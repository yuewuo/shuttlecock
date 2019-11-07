var classname = function() {
    let url = window.location.href.toString().split("?")[0];
    let v = url.split('/');
    name = v[v.length-1];
    return name.split(".")[0];
}();

function update_name() {
    if (longest == 0) {
        alert("表格未加载，请稍后");
        return;
    }
    let name = $("#name").val();
    if (name == '唐彦') {
        setCookie('name', name);
        $("#selfhistory").children().remove();
        $("#selfhistory").append("<tr><th>姓名</th><th>记录</th></tr>");
        for (let i=1; i<table.length; ++i) {
            $("#selfhistory").append("<tr><th>" + table[i][0] + "</th><th>" + table[i][longest] + "</th></tr>")
        }
    } else {
        let found = -1;
        for (let i=1; i<table.length; ++i) {
            if (name == table[i][0]) {
                found = i;
                break;
            }
        }
        if (found == -1) {
            // alert("未找到任何记录，请检查名字");
            console.error("未找到任何记录，请检查名字");
            delpara("name");
            delCookie('name');
            $("#name").val("");
            return;
        }
        setCookie('name', name);
        setpara("name", escape(name));
        $("#selfhistory").children().remove();
        $("#selfhistory").append("<tr><th>天</th><th>记录</th></tr>");
        for (let i=1; i<=longest; ++i) {
            $("#selfhistory").append("<tr><th>" + table[0][i] + "</th><th>" + table[found][i] + "</th></tr>")
        }
    }
    genwechat();
}

function update_today() {
    let name = $("#name").val();
    let value =  $("#tdata").val();
    if (name.length > 20 || value.length > 10) {
        alert("输入过长");
        return;
    }
    if (name.length == 0) {
        alert("请输入姓名，或点击表格中的姓名");
        return;
    }
    if (value.length == 0) {
        alert("请按样例输入计时结果，或使用页面内的计时工具自动填写");
        return;
    }
    $.post("/api/update_today/" + classname, { name, value }, function(data) {
        if ('ok' in data) {
            alert("更新成功");
            loadcsv(update_name);
        } else if (data.error == "ERROR:FORMAT") {
            alert("格式错误，请检查输入格式，例如\"L6R6\"，中间无空格");
        } else if (data.error == "ERROR:TIME") {
            alert("时间错误，请联系管理员处理");
        } else if (data.error == "ERROR:NAME") {
            alert("未找到此姓名，请检查，或联系管理员处理");
        } else if (data.error == "ERROR:LOSEARGUMENT") {
            alert("API调用异常，请联系管理员处理");
        }
    });
}

function variance_sqrt (numbers) {  
    let mean = 0;  
    let sum = 0;  
    for(let i=0;i<numbers.length;i++){  
        sum += numbers[i];  
    }  
    mean = sum / numbers.length;  
    sum = 0;  
    for(let i=0;i<numbers.length;i++){  
        sum += Math.pow(numbers[i] - mean , 2);  
    }  
    return Math.sqrt( sum / numbers.length );  
};

var csv;
var table = [];
var longest = 1;
function update_view() {
    // first find the longest one
    for (let i=1; i<table.length; ++i) {
        for (let j=table[i].length-1; j>0; --j) {
            if (table[i][j].length > 1) {
                if (longest < j) longest = j;
                break;
            }
        }
    }

    // console.log(table[0][longest]);
    $("#nowdate").html(table[0][longest]);
    let unfinish_list = [];
    for (let i=1; i<table.length; ++i) {
        if (table[i][longest].length <= 1) {
            unfinish_list.push(table[i][0]);
        }
    }
    let num = table.length - 1;
    $("#finishnum").html("" + (num - unfinish_list.length) + "/" + num);
    let todaysum = day_sum(longest);
    $("#todaysum").html(todaysum);
    let minusy = todaysum - day_sum(longest-1);
    $("#minusy").html((minusy > 0 ? "+" : "") + minusy);
    $("#unfinished").children().remove();
    // for (let i=0; i<unfinish_list.length / 3; ++i) {
    $("#allnames").children().remove();
    let i;
    for (i=0; i+3 < table.length; i+=3) {
        let elem = "<tr>"
        + "<th onclick=checkmore(\"" + table[i+1][0] + "\")" + (table[i+1][longest].length > 1 ? " style=\"color: green;\"" : "") + ">" + table[i+1][0] + "</th>" 
        + "<th onclick=checkmore(\"" + table[i+2][0] + "\")" + (table[i+2][longest].length > 1 ? " style=\"color: green;\"" : "") + ">" + table[i+2][0] + "</th>"
        + "<th onclick=checkmore(\"" + table[i+3][0] + "\")" + (table[i+3][longest].length > 1 ? " style=\"color: green;\"" : "") + ">" + table[i+3][0] + "</th>"
        + "</tr>";
        // console.log(elem);
        $("#allnames").append(elem);
        // $("#unfinished").append("<li style='margin-left: 30px;'>" + unfinish_list[i] + "</li>");
    }
    if (i+1 != table.length) {
        let a = "<th></th>";
        let b = "<th></th>";
        if (i+1 < table.length) a="<th onclick=checkmore(\""+table[i+1][0]+"\")"+(table[i+1][longest].length>1?" style=\"color: green;\"" : "")+">"+table[i+1][0]+"</th>";
        ++i;
        if (i+1 < table.length) b="<th onclick=checkmore(\""+table[i+1][0]+"\")"+(table[i+1][longest].length>1?" style=\"color: green;\"" : "")+">"+table[i+1][0]+"</th>";
        $("#allnames").append("<tr>" + a + b + "<th></th></tr>");
    }

    let data = [];
    for (let i=1; i<=longest; ++i) {
        let daysum = day_sum(i);
        let datcount = day_count(i);
        let daydata = day_data(i);
        data.push([i, [daysum, 0], [datcount == 0 ? 0 : 10 * daysum / datcount, variance_sqrt(daydata)]]);
    }
    for (let i=0; i<data.length; ++i) {
        let row = data[i][2];
        if (!(row[1]>0)) row[1] = 0;
    }
    // generalg.updateOptions({
    //     'labels': ['天', '总秒数'],
    //     'file': data
    // });
    if (generalg) {
    } else init_graph(['天', '总秒数', '平均秒数×10'], data);
}
function ele2LR(ele) {
    let l = ele.indexOf('L');
    let r = ele.indexOf('R');
    if (l == -1 || r == -1) return {first: null, L: 0, R: 0}
    if (l < r) {
        return {first: "L", L: parseInt(ele.substr(1, r-l-1)), R: parseInt(ele.substr(r+1))};
    } else {
        return {first: "R", R: parseInt(ele.substr(1, l-r-1)), L: parseInt(ele.substr(l+1))};
    }
}
function checkmore(name) {
    $("#name").val(name);
    update_name();
    document.getElementById('name').scrollIntoView();
}
function day_sum(day) {
    let sum = 0;
    for (let i=1; i<table.length; ++i) {
        let lr = ele2LR(table[i][day])
        sum += lr.L + lr.R;
    }
    return sum;
}

function day_count(day) {
    let count = 0;
    for (let i=1; i<table.length; ++i) {
        let lr = ele2LR(table[i][day])
        if (lr.first) count++;
    }
    return count;
}

function day_data(day) {
    let daydata = [];
    for (let i=1; i<table.length; ++i) {
        let lr = ele2LR(table[i][day])
        if (lr.first) daydata.push(lr.L + lr.R);
    }
    return daydata;
}

var generalg = null;
function init_graph(labels, data) {
    generalg = new Dygraph(
        document.getElementById("general"),
        data,
        {
            labels: labels,
            drawPoints: true,
            errorBars: true,  // to enable error bar
            drawAxesAtZero: true,
            strokeWidth: 1,
            showRangeSelector: true
        }
    );
}

function loadcsv(callback = null) {
    table = [];
    longest = 1;
    let req = new XMLHttpRequest();
    let nowTime = new Date().getTime(); // to prevent cache of csv file
    req.open('GET', '/api/download_csv/' + classname + '.csv?time=' + nowTime, true);
    req.overrideMimeType('text\/plain; charset=gb2312');  // this costs me 2 hour to make gb2312 work...
    req.onload = function(event) {
        csv = req.response;
        console.log(csv);
        let a = csv.split('\n');
        for (let i=0; i<a.length; ++i) {
            let b = a[i].split(',');
            if (b.length > 1) table.push(b);  // make sure it doesn't have the last line
        }
        // init_graph();
        update_view();
        if (callback) callback();
    }
    req.send(null);
}

function downloadcsv() {
    let nowTime = new Date().getTime(); // to prevent cache of csv file
    window.location.href = "/api/download_csv/" + classname + '.csv?time=' + nowTime
}

function getpara(name, alternative=null) {
	let reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
	let r = window.location.search.substr(1).match(reg);
	if(r!=null) return unescape(r[2]); return alternative;
}
function setpara(name, value) {
	let url = window.location.href.toString();
	let reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
	let r = window.location.search.substr(1).match(reg);
	if (r) url = url.replace(r[0], name+'='+value);
	else {
		let v = url.split("#");
		if (v[0].indexOf("?") == -1) v[0] += "?";
		if (v[0][v[0].length-1] != "?") v[0] += "&";
		v[0] += name + "=" + escape(value);
		url = v.join("#");
	}
	history.replaceState(null, "", url);
	return url;
}
function delpara(name) {
    let url = window.location.href.toString();
	let reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
    let r = window.location.search.substr(1).match(reg);
    if (r) {
        url = url.replace(r[0], "");
        url = url.replace("&&", "&");
        if (url[url.length-1] == "?") url = url.slice(0, url.length-1);
    }
    console.log(url);
	history.replaceState(null, "", url);
	return url;
}

var version = 'version 1910102300';
$(function() {
    $("#sysversion").html(version);
    console.log(version);
    let name = getpara('name');
    console.log(name);
    if (!name) name = getCookie('name');
    else name = unescape(name);
    console.log(name);
    if (name) {
        setpara("name", escape(name));
        $("#name").val(name);
    }
    loadcsv(function() {
        if (name) update_name();
    });
})

// 加入cookie方便同学每次填写
function setCookie(name,value)
{
    var Days = 30;
    var exp = new Date();
    exp.setTime(exp.getTime() + Days*24*60*60*1000);
    document.cookie = name + "="+ escape (value) + ";expires=" + exp.toGMTString();
}
function delCookie(name) {
    document.cookie = name + "=";
}
function getCookie(name)
{
    var arr,reg=new RegExp("(^| )"+name+"=([^;]*)(;|$)");
    if(arr=document.cookie.match(reg))
    return unescape(arr[2]);
    else return null;
}

function genwechat() {
    st = table[0][longest] + "中华毽单腿站打卡：";
    let idx = 1;
    for (let i=1; i<table.length; ++i) {
        if (table[i][longest].length > 1) {
            st += "\n" + idx + ". " + table[i][0] + " " + table[i][longest];
            ++idx;
        }
    }
    $("#clipinput").val(st);
}

var copyBtn = new ClipboardJS('#clipbutton').on('success', function(e) {
    var e = e || window.event;
    console.log(e);
}).on('error', function(e) {
    var e = e || window.event;
    console.log(e);
});

// 界面内计时
var leftc1 = "#FF6666";
var rightc1 = "#99CC66";
var leftc2 = "#FF4444";
var rightc2 = "#77AA44";
var nullc = "#AAAAAA";
function set_counting_attr(id) {
    // console.log(parseInt(0.3 * parseInt($("#counting").css("width"))) + "px");
    $("#" + id).css("width", parseInt(0.3 * parseInt($("#counting").css("width"))) + "px");
    $("#" + id).css("height", parseInt(0.3 * parseInt($("#counting").css("width"))) + "px");
    $("#" + id).css("line-height", parseInt(0.3 * parseInt($("#counting").css("width"))) + "px");
}
function sync_left_right() {
    set_counting_attr("left");
    $("#left").css("margin-left", parseInt(0.08 * parseInt($("#counting").css("width"))) + "px");
    $("#left").css("background-color", leftc1);
    set_counting_attr("right");
    $("#right").css("margin-right", parseInt(0.08 * parseInt($("#counting").css("width"))) + "px");
    $("#right").css("background-color", rightc1);
}

$(sync_left_right);
$(window).on("resize", sync_left_right);

var count_status = 0;
var intervalID;
var count = 0;
var start_time = null;  // 修复bug：手机息屏后时间停止计时
function count_interval() {
    let now_time = (new Date()).getTime();
    // console.log(now_time - start_time);
    // count += 1;
    // count = Math.round((now_time - start_time) / 1000);
    count = Math.trunc((now_time - start_time + 100) / 1000);
    $("#countnum").html(count);
    // console.log(count);
}
function update_count(isleft) {
    let val = $("#tdata").val();
    let L = val.indexOf('L');
    let R = val.indexOf('R');
    let not2 = L == -1 || R == -1;
    if (not2) {  // 直接输出
        if (isleft && R == -1) {  // 只输出L
            $("#tdata").val("L" + count);
        } else if (!isleft && L == -1) {  // 只输出R
            $("#tdata").val("R" + count);
        } else {
            if (isleft) $("#tdata").val(val + "L" + count);
            else $("#tdata").val(val + "R" + count);
        }
    } else {  // 两个都有，则先获得他们
        let Lval = 0;
        let Rval = 0;
        if (L < R) {
            Lval = val.slice(L+1, R);
            Rval = val.slice(R+1);
        } else {
            Rval = val.slice(R+1, L);
            Lval = val.slice(L+1);
        }
        if (isleft) $("#tdata").val("R" + Rval + "L" + count);
        else $("#tdata").val("L" + Lval + "R" + count);
    }
    // console.log(L);
}
function start_counting(isleft) {
    if (count_status == 0) {
        if (isleft) {
            $("#right").css("background-color", nullc);
            $("#left").css("background-color", leftc2);
            count_status = 1;
            count = 0;
            $("#countnum").html(count);
            start_time = (new Date()).getTime();
            intervalID = setInterval(count_interval, 100);
        } else {
            $("#left").css("background-color", nullc);
            $("#right").css("background-color", rightc2);
            count_status = 2;
            count = 0;
            $("#countnum").html(count);
            start_time = (new Date()).getTime();
            intervalID = setInterval(count_interval, 100);
        }
    } else if (count_status == 1 && isleft) {  // stop left
        clearInterval(intervalID);
        update_count(isleft)
        $("#left").css("background-color", leftc1);
        $("#right").css("background-color", rightc1);
        count_status = 0;
    } else if (count_status == 2 && !isleft) {  // stop right
        clearInterval(intervalID);
        update_count(isleft)
        $("#left").css("background-color", leftc1);
        $("#right").css("background-color", rightc1);
        count_status = 0;
    }
    // console.log(isleft);
}
