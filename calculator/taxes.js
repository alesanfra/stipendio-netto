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

const NATIONAL_BRACKETS_2021 = [
    { start: 0, rate: 0.23 },
    { start: 15000, rate: 0.27 },
    { start: 28000, rate: 0.38 },
    { start: 55000, rate: 0.41 },
    { start: 75000, rate: 0.43 },
]

const NATIONAL_BRACKETS_2022 = [
    { start: 0, rate: 0.23 },
    { start: 15000, rate: 0.25 },
    { start: 28000, rate: 0.35 },
    { start: 50000, rate: 0.43 },
]


// TODO: add all italian regions
const REGIONAL_BRACKETS = {
    "abruzzo": [{ start: 0, rate: 0.0173 }],
    "basilicata": [
        { start: 0, rate: 0.0123 },
        { start: 55000, rate: 0.0173 },
        { start: 75000, rate: 0.0233 },
    ],
    "bolzano": [
        { start: 0, rate: 0.0123 },
        { start: 75000, rate: 0.0173 },
    ],
    "calabria": [{ start: 0, rate: 0.0203 }],
    "campania": [{ start: 0, rate: 0.0203 }],
    "emilia_romagna": [
        { start: 0, rate: 0.0133 },
        { start: 15000, rate: 0.0193 },
        { start: 28000, rate: 0.0203 },
        { start: 55000, rate: 0.0223 },
        { start: 75000, rate: 0.0233 },
    ],
    "friuli_venezia_giulia": [{ start: 0, rate: 0.0123 }],
    "lazio": [{ start: 0, rate: 0.0173 }],
    "liguria": [
        { start: 0, rate: 0.0123 },
        { start: 15000, rate: 0.0181 },
        { start: 28000, rate: 0.0231 },
        { start: 55000, rate: 0.0232 },
        { start: 75000, rate: 0.0233 },
    ],
    "lombardia": [
        { start: 0, rate: 0.0123 },
        { start: 15000, rate: 0.0158 },
        { start: 28000, rate: 0.0172 },
        { start: 55000, rate: 0.0173 },
        { start: 75000, rate: 0.0174 },
    ],
    "marche": [
        { start: 0, rate: 0.0123 },
        { start: 15000, rate: 0.0153 },
        { start: 28000, rate: 0.0170 },
        { start: 55000, rate: 0.0172 },
        { start: 75000, rate: 0.0173 },
    ],
};


function cast(param, start, end, errorMessage) {
    let result = parseInt(param);
    if (isNaN(param) || param < start || param > end) {
        throw new Error(errorMessage + " must be in the interval from " + start + " to " + end);
    }
    return result
}


function computeSocialSecurityContribution(grossIncome) {
    // TODO companies > 50 employees have 0.0949 INPS rate
    return grossIncome * 0.0919;
}


function computeGrossIncomeTax(grossIncome, brackets, noTaxArea = 0) {
    if (grossIncome < noTaxArea) {
        return 0;
    }

    let totalTaxes = 0;

    for (let bracket of brackets.sort((x, y) => y.start - x.start)) {
        if (grossIncome > bracket.start) {
            let tax = (grossIncome - bracket.start) * bracket.rate;
            totalTaxes += tax;
            grossIncome = bracket.start;
        }
    }

    return totalTaxes;
}

/**
 * Computes IRPEF detractions as per https://www.agenziaentrate.gov.it/portale/la-detrazione-per-i-figli-a-carico
 * 
 * @param {*} grossIncome 
 * @param {*} totalChildren 
 * @param {*} childrenBelowThreeYears 
 * @param {*} childrenWithHandicap 
 * @returns 
 */
function computeChildrenDetraction(
    grossIncome,
    totalChildren = 0,
    childrenBelowThreeYears = 0,
    childrenWithHandicap = 0,

) {
    let grossDetraction = (totalChildren * 950) + (childrenBelowThreeYears * 270) + (childrenWithHandicap * 400);

    if (totalChildren >= 4) {
        grossDetraction += (totalChildren * 200) + 1200;
    }

    let grossIncomeThreshold = 80000 + (totalChildren * 15000);
    return Math.max(grossDetraction * ((grossIncomeThreshold - grossIncome) / grossIncomeThreshold), 0);
}


/**
 * Compute detrcation for dependent spouse
 * 
 * @param {*} grossIncome 
 * @returns 
 */
function computeSpouseDetraction(grossIncome) {
    if (grossIncome <= 15000) {
        return Math.max((800 - (110 * grossIncome / 15000)), 0);
    } else if (grossIncome <= 40000) {
        // TODO: implement corrections per bracket
        return 690;
    } else if (grossIncome <= 80000) {
        return Math.max((690 * (80000 - grossIncome) / 40000), 0);
    } else {
        return 0;
    }
}


function computeOtherRelativesDetraction(grossIncome) {
    return Math.max(750 * ((80000 - grossIncome) / 80000), 0);
}


function computeEmploymentDetraction(grossIncome, daysWorked = 365, daysInYear = 365) {
    // DETRAZIONI PER REDDITO DA LAVORO DIPENDENTE (TUIR art. 13 comma 1 e 2)
    let detraction1 = 0;

    if (grossIncome < 8000) {
        detraction1 = 1880;
    } else if (grossIncome <= 28000) {
        detraction1 = 978 + (902 * (28000 - grossIncome) / 20000);
    } else if (grossIncome < 55000) {
        detraction1 = 978 * (55000 - grossIncome) / 27000;
    }

    // ULTERIORE DETRAZIONE FISCALE (DL 3/2020 art. 1 e 2)
    let detraction2 = 0;

    if (grossIncome <= 28000) {
        detraction2 = 1200;
    } else if (grossIncome <= 35000) {
        detraction2 = 960 + 240 * ((35000 - grossIncome) / 7000);
    } else if (grossIncome < 40000) {
        detraction2 = 960 * ((40000 - grossIncome) / 5000);
    }

    return ((detraction1 + detraction2) * daysWorked / daysInYear);
}

function computeNetSalaryInItaly(
    grossIncome,
    region,
    hasDependentSpouse = false,
    numberOfChildrenBelow3Years = 0,
    numberOfChildrenAbove3Years = 0,
    numberOfChildrenBelow3YearsWithHandicap = 0,
    numberOfChildrenAbove3YearsWithHandicap = 0,
    numberOfOtherDependentRelatives = 0,
    percentageOfDependentChildren = 100,
    daysWithContractWithinYear = 365,
    numberOfMonthlyPayments = 14,
) {

    grossIncome = cast(grossIncome, 0, Infinity, "Gross Income");
    hasDependentSpouse = !!hasDependentSpouse;
    numberOfChildrenBelow3Years = cast(numberOfChildrenBelow3Years, 0, 20, "Number of children");
    numberOfChildrenAbove3Years = cast(numberOfChildrenAbove3Years, 0, 20, "Number of children");
    numberOfChildrenBelow3YearsWithHandicap = cast(numberOfChildrenBelow3YearsWithHandicap, 0, 20, "Number of children");
    numberOfChildrenAbove3YearsWithHandicap = cast(numberOfChildrenAbove3YearsWithHandicap, 0, 20, "Number of children");
    numberOfOtherDependentRelatives = cast(numberOfOtherDependentRelatives, 0, 20, "Number of other relatives");
    percentageOfDependentChildren = cast(percentageOfDependentChildren, 0, 100, "Percentage of dependent children");
    numberOfMonthlyPayments = cast(numberOfMonthlyPayments, 12, 15, "Monthly payments");
    daysWithContractWithinYear = cast(daysWithContractWithinYear, 20, 366, "Days with contract");

    let socialSecurityContribution = computeSocialSecurityContribution(grossIncome);
    let taxable = grossIncome - socialSecurityContribution;

    // Compute gross income tax (without detractions)
    let grossIncomeTax = computeGrossIncomeTax(taxable, NATIONAL_BRACKETS_2022, 8174);
    grossIncomeTax += computeGrossIncomeTax(taxable, [{ start: 0, rate: 0.0193 }]); // Regional income tax
    grossIncomeTax += computeGrossIncomeTax(taxable, [{ start: 0, rate: 0.008 }]); // Municipal income tax

    // Compute net income tax
    let netIncomeTax = grossIncomeTax - computeEmploymentDetraction(taxable, daysWithContractWithinYear);

    if (hasDependentSpouse) {
        netIncomeTax -= computeSpouseDetraction(taxable);
    }

    let totalChildren =
        numberOfChildrenBelow3Years +
        numberOfChildrenAbove3Years +
        numberOfChildrenBelow3YearsWithHandicap +
        numberOfChildrenAbove3YearsWithHandicap;

    if (totalChildren > 0) {
        netIncomeTax -= computeChildrenDetraction(
            taxable,
            totalChildren,
            numberOfChildrenBelow3Years + numberOfChildrenBelow3YearsWithHandicap,
            numberOfChildrenBelow3YearsWithHandicap + numberOfChildrenAbove3YearsWithHandicap
        ) * percentageOfDependentChildren / 100;
    }

    let incomeTax = Math.max(netIncomeTax, 0);
    let netIncome = (grossIncome - socialSecurityContribution - incomeTax);

    return {
        netIncome: netIncome,
        incomeTax: incomeTax,
        socialSecurityContribution: socialSecurityContribution,
        monthlyNetIncome: netIncome / numberOfMonthlyPayments,
        averageRate:  1 - (netIncome / taxable),
    }
}

module.exports = {
    computeNetSalaryInItaly: computeNetSalaryInItaly
};
