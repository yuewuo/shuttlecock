
// helper functions
function Lw(x) { return "{"+(x==undefined?("\\color{red}{\\mathbf{undefined}}"):x)+"}"; }  // latex warp
function Red(x) { return "\\color{red}"+Lw(x); }
function Green(x) { return "\\color{green}"+Lw(x); }
function Uni(x) { return x; }

/*
 * Logic System
 */

class System {
    constructor(template) {
        this.sql_tables = [];
        this.private_apis = [];
        this.template = template;
    }
    append_sql_table(table) {
        console.assert(SqlDatabaseTable.prototype.isPrototypeOf(table), "type error");
        this.sql_tables.push(table);
    }
    append_private_api(private_api) {
        console.assert(API.prototype.isPrototypeOf(private_api), "type error");
        this.private_apis.push(private_api);
    }
    flatten_values(obj) {
        let values = [];
        let keys = Object.keys(obj);
        for (let i=0; i<keys.length; ++i) {
            if (typeof(obj[keys[i]]) == 'string') values.push(obj[keys[i]]);
            else values = values.concat(this.flatten_values(obj[keys[i]]));
        }
        return values;
    }
    set_type(type) {
        let values = this.flatten_values(type);
        let found_equals = [];
        while (values.length > 0) {
            let val = values.pop();
            for (let i=0; i<values.length; ++i) if (val == values[i]) found_equals.push(val);
        }
        if (found_equals.length > 0) {
            console.error("found equal type strings: " + found_equals)
        } else this.type = type;
    }
    render() {
        $("#write").html(this.template);
        let database_design_html = "";
        for (let i=0; i<this.sql_tables.length; ++i) {
            database_design_html += this.sql_tables[i].to_html();
        }
        $("#database_design").html(database_design_html);
        let private_apis_html = "";
        for (let i=0; i<this.private_apis.length; ++i) {
            private_apis_html += this.private_apis[i].to_html();
        }
        $("#private_APIs").html(private_apis_html);
    }
}

/*
 * Sql Database Definition
 */

const SqlDatabaseTableTypes = {
    UNKNOWN: [0],
    INTEGER: [1],
    VARCHAR: [2,0],  // args[1] is the length of varchar
    CHAR: [3,0],  // args[1] is the length of char
    BOOLEAN: [4],
    JSONB: [5],
    TIMESTAMP: [6],
    toString(type) {
        if (type[0] == 0) return Red("UNKNOWN");
        if (type[0] == 1) return "INTEGER";
        if (type[0] == 2) return "VARCHAR(" + type[1] + ")";
        if (type[0] == 3) return "CHAR(" + type[1] + ")";
        if (type[0] == 4) return "BOOLEAN";
        if (type[0] == 5) return "JSONB";
        if (type[0] == 6) return "TIMESTAMP";
    }
}
const SDTT = SqlDatabaseTableTypes;

class SqlDatabaseTable {
    constructor(name, table, description) {
        this.name = name;
        this.table = table;
        this.keys = [];
        this.description = description;
    }
    append_key(key, type=SDTT.UNKNOWN, unique=false) {
        this.keys.push({
            key,
            type,
            unique,
        });
    }
    to_latex() {
        let keys_mat = "";
        for (let i=0; i<this.keys.length; ++i) {
            if (keys_mat.length != 0) keys_mat += "\\\\";
            keys_mat += 
                "\\mathtt" + Lw((this.keys[i].unique?Green:Uni)(this.keys[i].key.replace(/_/g, "\\_"))) + " & " +
                "\\mathtt" + Lw(SDTT.toString(this.keys[i].type)
                );
        }
        return Lw(this.name) + "_" + Lw("\\small{\\left(\\begin{smallmatrix}" + keys_mat + "\\end{smallmatrix}\\right)}");
    }
    to_html() {
        return `<h4>\\(${this.name}\\):&nbsp;${this.table}</h4>`
            + `<p>${this.description}</p>`
            + "$$" + this.to_latex() + "$$";
    }
}

const LinearPropositionType = {
    ATOM_NOT: -1,  // A^{⊥}
    ATOM: 0,  // A
    DEDUCTION: 1,  // A ⊸ B
    TENSOR: 2,  // ⊗
    PLUS: 3,  // ⊕
    WITH: 4,  // &
    PAR: 5,  // ⅋
    BANG: 6,  // !
    WHY_NOT: 7,  // ?
    TENSOR_UNIT: 8,  // 1
    PLUS_UNIT: 9,  // 0
    WITH_UNIT: 10,  // ⊤,
    PAR_UNIT: 11,  // ⊥
};
const LPT = LinearPropositionType;

// A ::= p ∣ p⊥ ∣ A ⊗ A ∣ A ⊕ A ∣ A & A ∣ A ⅋ A ∣ 1 ∣ 0 ∣ ⊤ ∣ ⊥ ∣ !A ∣ ?A
class LinearProposition {
    constructor(type=LPT.ATOM, ...args) {
        this.type = type;
        this.args = [...args];
    }
    without_parentheses() {
        if (this.type == LPT.ATOM_NOT) return true;
        if (this.type == LPT.ATOM) return true;
        if (this.type == LPT.TENSOR_UNIT) return true;
        if (this.type == LPT.PLUS_UNIT) return true;
        if (this.type == LPT.WITH_UNIT) return true;
        if (this.type == LPT.PAR_UNIT) return true;
        return false;
    }
    to_latex() {
        if (this.type == LPT.ATOM) {
            return Lw(this.args[0]);
        }
        if (this.type == LPT.ATOM_NOT) {
            return Lw(this.args[0]) + "^{\\perp}";
        }
        if (this.type == LPT.BANG) {
            return "!\\left(" + this.args[0].to_latex() + "\\right)";
        }
        if (this.type == LPT.TENSOR_UNIT) {
            return "1";
        }
        if (this.type == LPT.DEDUCTION) {
            let s = "";
            if (this.args[0].without_parentheses()) s += this.args[0].to_latex();
            else s += "\\left(" + this.args[0].to_latex() + "\\right)";
            s += "\\multimap";
            if (this.args[1].without_parentheses()) s += this.args[1].to_latex();
            else s += "\\left(" + this.args[1].to_latex() + "\\right)";
            return s;
        }
        if (this.type == LPT.TENSOR) {
            let s = "";
            if (this.args[0].without_parentheses()) s += this.args[0].to_latex();
            else s += "\\left(" + this.args[0].to_latex() + "\\right)";
            for (let i=1; i<this.args.length; ++i) {
                s += "\\otimes";
                if (this.args[i].without_parentheses()) s += this.args[i].to_latex();
                else s += "\\left(" + this.args[i].to_latex() + "\\right)";
            }
            return s;
        }
        if (this.type == LPT.PLUS) {
            let s = "";
            if (this.args[0].without_parentheses()) s += this.args[0].to_latex();
            else s += "\\left(" + this.args[0].to_latex() + "\\right)";
            for (let i=1; i<this.args.length; ++i) {
                s += "\\oplus";
                if (this.args[i].without_parentheses()) s += this.args[i].to_latex();
                else s += "\\left(" + this.args[i].to_latex() + "\\right)";
            }
            return s;
        }
        console.assert(false, "type not supported");
        return "\\mathtt{\\color{red}{UNKNOWN}}"
    }
}
function NLP(...args) { return new LinearProposition(...args); }

class API {
    constructor(name, description, proposition) {
        this.name = name;
        this.description = description;
        this.proposition = proposition;
    }
    to_html() {
        let proposition_latex = "\\mathtt{\\color{red}{INVALID\\_PROPOSITION}}";
        if (this.proposition) {
            console.assert(LinearProposition.prototype.isPrototypeOf(this.proposition), "type error");
            proposition_latex = new LinearProposition(LinearPropositionType.BANG, this.proposition, null).to_latex();
        }
        return `<h4>${this.name}</h4>`
            + `<p>${this.description}</p>`
            + "$$" + proposition_latex + "$$";
    }
}
