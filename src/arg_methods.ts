import * as vscode from "vscode";

export function shiftLeft() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const originalPosition = editor.document.offsetAt(editor.selection.active);
  const text = editor.document.getText();

  try {
    const currentArgPosition = getCurrentArgPosition(text, originalPosition);
    if (!currentArgPosition) {
      return;
    }
    const prevArgPosition = getCurrentArgPosition(
      text,
      currentArgPosition.prevBreakIdx - 1
    );
    if (!prevArgPosition) {
      return;
    }
    if (
      text.slice(prevArgPosition.idx, prevArgPosition.idx + 10) !==
      prevArgPosition.text.slice(0, 10)
    ) {
      console.log(
        "Was expecting these to be the same:",
        text.slice(prevArgPosition.idx, prevArgPosition.idx + 10),
        prevArgPosition.text.slice(0, 10)
      );
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    const prevRange = new vscode.Range(
      editor.document.positionAt(prevArgPosition.idx),
      editor.document.positionAt(prevArgPosition.idx + prevArgPosition.length)
    );
    const currRange = new vscode.Range(
      editor.document.positionAt(currentArgPosition.idx),
      editor.document.positionAt(
        currentArgPosition.idx + currentArgPosition.length
      )
    );
    edit.replace(editor.document.uri, prevRange, currentArgPosition.text);
    edit.replace(editor.document.uri, currRange, prevArgPosition.text);
    vscode.workspace.applyEdit(edit);
  } catch (err) {
    console.error(err);
  }
}
export function shiftRight() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const originalPosition = editor.document.offsetAt(editor.selection.active);
  const text = editor.document.getText();

  try {
    const currentArgPosition = getCurrentArgPosition(text, originalPosition);
    if (!currentArgPosition) {
      return;
    }
    const nextArgPosition = getCurrentArgPosition(
      text,
      currentArgPosition.nextBreakIdx + 1
    );
    if (!nextArgPosition) {
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    const nextRange = new vscode.Range(
      editor.document.positionAt(nextArgPosition.idx),
      editor.document.positionAt(nextArgPosition.idx + nextArgPosition.length)
    );
    const currRange = new vscode.Range(
      editor.document.positionAt(currentArgPosition.idx),
      editor.document.positionAt(
        currentArgPosition.idx + currentArgPosition.length
      )
    );
    edit.replace(editor.document.uri, nextRange, currentArgPosition.text);
    edit.replace(editor.document.uri, currRange, nextArgPosition.text);
    vscode.workspace.applyEdit(edit);
  } catch (err) {
    console.error(err);
  }
}
type ArgumentPosition = {
  idx: number;
  length: number;
  prevBreakIdx: number;
  nextBreakIdx: number;
  text: string;
};
type AllowedOpeningBrackets = "(" | "{";
type AllowedClosingBrackets = ")" | "}";
type AllowedBrackets = AllowedOpeningBrackets | AllowedClosingBrackets;
const ALLOWED_OPENING_BRACKETS: Set<AllowedOpeningBrackets> = new Set([
  "(",
  "{"
]);
const ALLOWED_CLOSING_BRACKETS: Set<AllowedClosingBrackets> = new Set([
  ")",
  "}"
]);
const DELIMETER = ",";
const OPENING_BRACKET_MAP: {
  [key in AllowedOpeningBrackets]: AllowedClosingBrackets
} = {
  "(": ")",
  "{": "}"
};
const CLOSING_BRACKET_MAP: {
  [key in AllowedClosingBrackets]: AllowedOpeningBrackets
} = {
  ")": "(",
  "}": "{"
};
function getCurrentArgPosition(
  text: string,
  originalPosition: number
): ArgumentPosition | null {
  const prevBreak = getPreviousBreakIdx(text, originalPosition);
  if (prevBreak === null) {
    return null;
  }
  const nextBreak = getNextBreakIdx(text, originalPosition);
  if (nextBreak === null) {
    return null;
  }
  const subText = text.slice(prevBreak + 1, nextBreak);
  const match = /^(\s*)(\S+[\s\S]*\S+)(\s*)$/.exec(subText);
  if (!match) {
    console.error(
      "got so far, what went wrong? idx:",
      prevBreak,
      "to",
      nextBreak,
      "string:",
      subText
    );
    return null;
  }
  return {
    idx: match.index + match[1].length + prevBreak + 1,
    length: match[2].length,
    prevBreakIdx: prevBreak,
    nextBreakIdx: nextBreak,
    text: match[2]
  };
}
function getPreviousBreakIdx(
  text: string,
  originalPosition: number,
  allowedOpeningBrackets = ALLOWED_OPENING_BRACKETS
): number | null {
  const closingBracketList = Array.from(allowedOpeningBrackets).map(
    b => OPENING_BRACKET_MAP[b]
  );
  const allowedClosingBrackets = new Set(closingBracketList);
  const allowedBrackets = (Array.from(
    allowedOpeningBrackets
  ) as AllowedBrackets[]).concat(closingBracketList);
  const regex = new RegExp(`[${allowedBrackets.join("")}${DELIMETER}]`, "g");
  const stack: string[] = [];
  const subText = text.slice(0, originalPosition);
  const matches = findAll(regex, subText);
  for (let i = matches.length - 1; i > 0; --i) {
    if (
      allowedOpeningBrackets.has(matches[i][0] as AllowedOpeningBrackets) ||
      matches[i][0] === DELIMETER
    ) {
      if (stack.length === 0) {
        return matches[i].index;
      } else if (matches[i][0] === DELIMETER) {
        continue;
      }
      const openingBracket = matches[i][0] as AllowedOpeningBrackets;
      const popped = stack.pop();
      if (popped !== OPENING_BRACKET_MAP[openingBracket]) {
        console.error(
          "Invalid opening bracket: ",
          openingBracket,
          "where stack was:",
          popped
        );
        return null;
      }
      stack.push(openingBracket);
    } else if (
      allowedClosingBrackets.has(matches[i][0] as AllowedClosingBrackets)
    ) {
      stack.push(matches[i][0]);
    }
  }
  return null;
}
function getNextBreakIdx(
  text: string,
  originalPosition: number,
  allowedClosingBrackets = ALLOWED_CLOSING_BRACKETS
): number | null {
  const openingBracketList = Array.from(allowedClosingBrackets).map(
    b => CLOSING_BRACKET_MAP[b]
  );
  const allowedOpeningBrackets = new Set(openingBracketList);
  const allowedBrackets = (Array.from(
    allowedClosingBrackets
  ) as AllowedBrackets[]).concat(openingBracketList);
  const regex = new RegExp(`[${allowedBrackets.join("")}${DELIMETER}]`, "g");
  const stack: string[] = [];
  const subText = text.slice(originalPosition + 1);
  const matches = findAll(regex, subText);
  for (let i = 0; i < matches.length; ++i) {
    if (
      allowedClosingBrackets.has(matches[i][0] as AllowedClosingBrackets) ||
      matches[i][0] === DELIMETER
    ) {
      if (stack.length === 0) {
        return matches[i].index + originalPosition + 1;
      } else if (matches[i][0] === DELIMETER) {
        continue;
      }
      const closingBracket = matches[i][0] as AllowedClosingBrackets;
      const popped = stack.pop();
      if (popped !== CLOSING_BRACKET_MAP[closingBracket]) {
        console.error(
          "Invalid closing bracket: ",
          closingBracket,
          "where stack was:",
          popped
        );
        return null;
      }
      stack.push(closingBracket);
    } else if (
      allowedOpeningBrackets.has(matches[i][0] as AllowedOpeningBrackets)
    ) {
      stack.push(matches[i][0]);
    }
  }
  return null;
}

function findAll(rx: RegExp, text: string): RegExpExecArray[] {
  const matches = [];
  let match;
  while ((match = rx.exec(text))) {
    matches.push(match);
  }
  return matches;
}
