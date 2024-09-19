/**
 * @typedef {Object} Location - Information of a cursor location
 * @property {number} pos - Position of the cursor in the source
 * @property {number} row - Row (line) number of the position
 * @property {number} col - Column number of the position
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

    // JavaScript does not support Unicode natively
    // Convert to Unicode character array
    /** @type {string[]} */
    const sourceChars =  [...srcContent];

    /**
     * @type {string[]}
     * Source code in Unicode character array
     */
    this.__sourceChars = sourceChars;

    /**
     * @type {number}
     * Max length of the source content
     */
    this.__length = sourceChars.length;

    /**
     * @type {Location}
     * Information about current cursor position
     */
    this.__location = {
      pos: 0,
      row: 1,
      col: 1,
    };

    /**
     * @type {Location}
     * Character in current cursor position
     */
    this.__char = this.getCurrChar();

    this.elements = [];
  }

  /**
   * Get the current cursor position
   * @return {number}
   **/
  getCurrPos() {
    return this.__location.pos;
  }

  /**
   * Get the character at current cursor position
   * @return {string}
   **/
  getCurrChar() {
    let {pos} = this.__location;
    if (pos >= this.__length) return null; // EOI
    this.__char = this.__sourceChars[pos];
    return this.__char;
  }

  /**
   * Get the location of current cursor
   * @return {Location}
  **/
  getCurrLocation() {
    return Object.assign({}, this.__location);;
  }

  /**
   * Advance the cursor and get the next character
   * @return {string}
   **/
  getNextChar() {
    let {pos, row, col} = this.__location;
    let char = this.__char;

    if (char === null) return null; // Already EOI

    if (pos + 1 >= this.__length) { // End of input.
      this.__location.pos = this.__length;
      this.__char = null;
      return null; // EOI
    }

    if (char === '\n') { // Are we starting a new line?
      row++; 
      col = 1;
    } else {
      col++;
    }

    pos++;
    char = this.__sourceChars[pos];

    this.__location = {pos: pos, row: row, col: col};
    this.__char = char;
    return char;
  }

  /**
   * Backtracking to a saved position
   * @param {Location} loc - Saved location
   **/
  backtrack(loc) {
    this.__location = {pos: loc.pos, row: loc.row, col: loc.col};
    this.getCurrChar();
  }

  /**
   * Extract a string fragment from source
   * @param {number} start
   * @param {number} end
   * @return {string}
   **/
  extract(start, end) {
    return this.__sourceChars.slice(start, end).join('');
  }

  /**
   * Parse white space
   * @return {string|null}
   **/
  parseWhiteSpace() {
    const startLoc = this.getCurrLocation();
    let char = this.getCurrChar();
    let text = '';

    while ((char) && (' \n\t'.indexOf(char) !== -1)) {
      text = text + char;
      char = this.getNextChar();
    }

    const endPos = this.getCurrPos();
    if (endPos > startPos) {
      return this.extract(startPos.pos, endPos.pos);
    } else {
      this.backtrack(startPos, startLoc);
      return null;
    }
  }

  /**
   * Parse HTML tag name
   * @return {string|null}
   **/
  parseHtmlTagName() {
    const startLoc = this.getCurrLocation();
    let char = this.getCurrChar();

    while ((char) && (' \n\r\'"=/>'.indexOf(char) === -1)) {
      char = this.getNextChar();
    }

    const endLoc = this.getCurrLocation();

    if (endLoc.pos > startLoc.pos) {
      return this.extract(startLoc.pos, endLoc.pos).toLowerCase();
    } else {
      this.backtrack(startLoc);
      return null;
    }
  }

  /**
   * Parse HTML element
   * @return {object}
   **/
  parseHtmlElement() {
    const startLoc = this.getCurrLocation();
    let char = this.getCurrChar();
    if (char === '<') {
      char = this.getNextChar();
    } else {
      this.backtrack(startLoc);
      return null;
    }

    const tagName = this.parseHtmlTagName();
    if (tagName === null) {
      this.backtrack(startLoc);
      return null;
    }

    const endLoc = this.getCurrLocation();
    return ({
      start: startLoc,
      end: endLoc,
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
