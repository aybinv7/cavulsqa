import type { CompiledQuery } from "kysely";

export interface StatementFacts {
  mutates: boolean;
  inserts: boolean;
  hasReturning: boolean;
}

const READ_ONLY_KEYWORDS = new Set(["select", "pragma", "explain"]);
const INSERTING_KEYWORDS = new Set(["insert", "replace"]);
const STATEMENT_KEYWORDS = new Set([
  ...READ_ONLY_KEYWORDS,
  ...INSERTING_KEYWORDS,
  "update",
  "delete",
]);

const READ_ONLY: StatementFacts = { mutates: false, inserts: false, hasReturning: false };

/**
 * What a dialect needs to know about a statement, taken from the tree kysely compiled rather than
 * from the SQL it produced. Matching on the text routed `insert into t select ...` to the read path,
 * where the Capacitor plugin ran it but reported no change count and never flushed the web store.
 */
export function statementFacts(query: CompiledQuery): StatementFacts {
  const node = query.query;

  if (node.kind === "RawNode") return rawFacts(query.sql);
  if (node.kind === "SelectQueryNode") return READ_ONLY;

  // Every other root node writes something, schema nodes included. An unrecognised one counts as a
  // write: sending a write down the read path loses it, sending a read down the write path errors.
  return {
    mutates: true,
    inserts: node.kind === "InsertQueryNode",
    hasReturning: "returning" in node && node.returning !== undefined,
  };
}

function rawFacts(sql: string): StatementFacts {
  const words = topLevelWords(sql);
  const keyword = words.find((word) => STATEMENT_KEYWORDS.has(word)) ?? null;

  return {
    mutates: keyword === null || !READ_ONLY_KEYWORDS.has(keyword),
    inserts: keyword !== null && INSERTING_KEYWORDS.has(keyword),
    hasReturning: words.includes("returning"),
  };
}

/**
 * The words outside every string, comment and bracket, so a leading `with` clause is stepped over
 * and a subquery cannot be mistaken for the statement: in `with x as (select 1) insert into t`,
 * `insert` is the first top-level keyword and `select` never appears at that level at all.
 */
function topLevelWords(sql: string): string[] {
  const kept: string[] = [];
  let depth = 0;

  for (let index = 0; index < sql.length; index++) {
    const char = sql[index];

    if (char === "'" || char === '"' || char === "`") {
      index = skipQuoted(sql, index);
      kept.push(" ");
      continue;
    }
    if (char === "-" && sql[index + 1] === "-") {
      const end = sql.indexOf("\n", index);
      if (end === -1) break;
      index = end;
      kept.push(" ");
      continue;
    }
    if (char === "/" && sql[index + 1] === "*") {
      const end = sql.indexOf("*/", index + 2);
      if (end === -1) break;
      index = end + 1;
      kept.push(" ");
      continue;
    }
    if (char === "(") {
      depth++;
      kept.push(" ");
      continue;
    }
    if (char === ")") {
      depth--;
      kept.push(" ");
      continue;
    }

    kept.push(depth === 0 ? char : " ");
  }

  return kept
    .join("")
    .toLowerCase()
    .split(/[^a-z0-9_$]+/)
    .filter(Boolean);
}

function skipQuoted(sql: string, start: number): number {
  const quote = sql[start];

  for (let index = start + 1; index < sql.length; index++) {
    if (sql[index] !== quote) continue;
    // Doubled quote is SQL's escape, so the literal carries on past it.
    if (sql[index + 1] === quote) {
      index++;
      continue;
    }
    return index;
  }

  return sql.length;
}
