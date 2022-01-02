/*
    Stipendio Netto - compute italian social security and income tax
    Copyright (C) 2021  Alessio Sanfratello

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const assert = require('assert');
const taxes = require('../taxes');

describe('Base income test', () => {
    it('should return 14000', () => {
        assert.equal(taxes.computeNetSalaryInItaly(42250, "aaa"), 2);
    });

});