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
    this.__char = this.readChar();

    this.elements = [];
  }

  /**
   * Read the character at current cursor position
   * @return {string}
   **/
  readChar() {
    let {pos} = this.__location;
    if (pos >= this.__length) return null; // EOI
    return this.__sourceChars[pos];
  }

  /**
   * Get the current cursor position
   * @return {number}
   **/
  getCurrPos() {
    return this.__location.pos;
  }

  /**
   * Get the location of current cursor
   * @return {Location}
  **/
  getCurrLocation() {
    return Object.assign({}, this.__location);;
  }

  /**
   * Get the character at current cursor position
   * @return {string}
   **/
  getCurrChar() {
    return this.__char;
  }

  /**
   * Get the character code at current cursor position
   * @return {number}
   **/
  getCurrCharCode() {
    return (this.__char)?this.__char.charCodeAt(0):0;
  }

  /**
   * Advance the cursor and get the next character
   * @return {string}
   **/
  getNextChar() {
    this.advance();
    return this.getCurrChar();
  }

  /**
   * Advance the cursor and get char code of the next character
   * @return {string}
   **/
  getNextCharCode() {
    this.advance();
    return this.getCurrCharCode();
  }

  /**
   * Move back to a saved position and update cached char
   * @param {Location} loc - Saved location
   **/
  backtrack(loc) {
    this.__location = {pos: loc.pos, row: loc.row, col: loc.col};
    this.__char = this.readChar();
  }

  /** Advance cursor and update cached char */
  advance() {
    let {pos, row, col} = this.__location;

    if (pos + 1 >= this.__length) { // End of input.
      this.__location.pos = this.__length;
      this.__char = null;
      return;
    }

    let char = this.__char;
    if (char === '\n') { // Are we starting a new line?
      row++; 
      col = 1;
    } else {
      col++;
    }

    pos++;

    this.__location = {pos: pos, row: row, col: col};
    this.__char = this.readChar();
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

    const endLoc = this.getCurrLocation();
    if (endLoc.pos > startLoc.pos) {
      return this.extract(startLoc.pos, endLoc.pos);
    } else {
      this.backtrack(startLoc);
      return null;
    }
  }

  /**
   * Parse value assigned to an HTML attribute
   * @return {string|null}
   **/
  parseAttributeValue() {
    const startLoc = this.getCurrLocation();
    let char = this.getCurrChar();
    // Assuming valid XML syntax (value must be quoted)
    if (char !== '"') return null;


    char = this.getNextChar();
    const valueStartPos = this.getCurrLocation().pos;

    while ((char) && (char !== '\n') && (char !== '"')) {
      char = this.getNextChar();
    }

    if (char !== '"') {
      this.backtrack(startLoc);
      return null;
    }

    const valueEndPos = this.getCurrLocation().pos;
    return this.extract(valueStartPos+1, valueEndPos-1);
  }

  /**
   * Parse attribute name inside an HTML tag
   * @return {string|null}
   **/
  parseAttributeName() {
    const startLoc = this.getCurrLocation();
    let char = this.getCurrChar();

    while ((char) && (' \n\t\'"=/>'.indexOf(char) === -1)) {
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
   * Parse HTML tag name
   * @return {string|null}
   **/
  parseHtmlTagName() {
    const startLoc = this.getCurrLocation();
    let code = this.getCurrCharCode();

    while (((code >= 65) && (code <= 90))||((code >= 97) && (code <= 122))) {
      code = this.getNextCharCode();
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
      this.advance();
    } else {
      this.backtrack(startLoc);
      return null;
    }

    const tagName = this.parseHtmlTagName();
    if (tagName === null) {
      this.backtrack(startLoc);
      return null;
    }

    const attributes = [];

    do {
      let attributeName;
      let attributeValue = null;

      this.parseWhiteSpace();
      attributeName = this.parseAttributeName();

      if (!attributeName) break;

      this.parseWhiteSpace();
      char = this.getCurrChar();
      if (char === '=') {
        this.parseWhiteSpace();
        attributeValue = this.parseAttributeValue();
        if (!attributeValue) {
          throw new Error(`Failed to tokenize [text fragment]`)
        }
      }

      attributes.push({
        name: attributeName,
        value: attributeValue,
      });
    } while (true)    

    const endLoc = this.getCurrLocation();
    return ({
      start: startLoc,
      end: endLoc,
      tagName: tagName,
      attributes: attributes,
    })
  }

  /**
   * Parse the page
   **/
  parse() {
    return this.parseHtmlElement();
  }
};

console.log((new htmlParser('<this is a test> <is> <a> <test>')).parse());
