/**
 * @typedef {Object} Location - Row and column numbers of a cursor location
 * @property {number} row - Row (line) number
 * @property {number} col - Column number
 */


export class htmlParser {
  /**
   * @param {string} srcContent - source content
   **/
  constructor(srcContent) {
    // For simplicity, convert all CRLF to LF
    srcContent = srcContent
      .replaceAll('\r\n', '\n')
      .replaceAll('\r', '\n');

    // Convert the source to Unicode character array
    this.sourceChars = [...srcContent];

    this.currPos = 0;
    this.currLocation = {row: 0, col: 0};
    this.currChar = this.sourceChars[this.currPos];
    this.elements = [];
  }

  /**
   * Get the current cursor position
   * @return {number}
   **/
  getCurrPos() {
    return this.currPos;
  }

  /**
   * Get the character at current cursor position
   * @return {string}
   **/
  getCurrChar() {
    return this.currChar;
  }

  /**
   * Get the location of current cursor
   * @return {Location}
  **/
  getCurrLocation() {
    return ({
      row: this.currLocation.row,
      col: this.currLocation.col,
    });
  }

  /**
   * Advance the cursor and get the next character
   * @return {string}
   **/
  getNextChar() {
    if (this.currPos >= this.sourceChars.length) {
      return null; // EOF
    }

    if (this.currChar === '\n') {
      this.currLocation.col = 0;
      this.currLocation.row++;
    } else {
      this.currLocation.col++;
    }
    this.currChar = this.sourceChars[++this.currPos];
    return this.currChar;
  }

  /**
   * Backtracking to a saved position
   * @param {number} pos - cursor position
   * @param {Location} loc - location
   **/
  backtrack(pos, loc) {
    this.currPos = pos;
    this.currLocation = {row: loc.row, col: loc.col};
  }

  /**
   * Extract a string fragment from source
   * @param {number} start
   * @param {number} end
   * @return {string}
   **/
  extract(start, end) {
    return this.sourceChars.slice(start, end).join('');
  }

  /**
   * Parse HTML tag name
   * @return {string|null}
   **/
  parseHtmlTagName() {
    const startPos = this.getCurrPos();
    const startLoc = this.getCurrLocation();
    let char = this.getCurrChar();

    while ((char) && (' \n\r\'"=/>'.indexOf(char) === -1)) {
      char = this.getNextChar();
    }

    const endPos = this.getCurrPos();
    if (endPos > startPos) {
      return this.extract(startPos, endPos).toLowerCase();
    } else {
      this.backtrack(startPos, startLoc);
      return null;
    }
  }

  /**
   * Parse HTML element
   * @return {string|null}
   **/
  parseHtmlElement() {
    const startPos = this.getCurrPos();
    const startLoc = this.getCurrLocation();
    let char = this.getCurrChar();
    if (char === '<') {
      this.getNextChar();
    } else {
      this.backtrack(startPos, startLoc);
      return null;
    }

    const tagName = this.parseHtmlTagName();
    if (tagName === null) {
      this.backtrack(startPos, startLoc);
      return null;
    }

    return ({
      pos: startPos,
      location: startLoc,
      tagName: tagName,
    })
  }

  /**
   * Parse the page
   **/
  parse() {
    return this.parseHtmlElement().tagName;
  }
};

// console.log((new htmlParser('<this> <is> <a> <test>')).parse());
