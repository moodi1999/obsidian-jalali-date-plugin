import * as chrono from "chrono-node";
import {Chrono, Parser} from "chrono-node";
import type {Moment} from "moment";
import {DayOfWeek} from "./settings";
import {getLastDayOfMonth, ORDINAL_NUMBER_PATTERN, parseOrdinalNumberPattern,} from "./utils";
import moment, {DurationInputArg2, unitOfTime} from "jalali-moment";

export interface NLDResult {
	formattedString: string;
	date: Date;
	moment: Moment;
}

function getLocalizedChrono(): Chrono {
	const locale = window.moment.locale();

	switch (locale) {
		case "en-gb":
			return chrono.en.casual;
		default:
			return chrono.en.casual;
	}
}

function getConfiguredChrono(): Chrono {
	const localizedChrono = getLocalizedChrono();
	localizedChrono.parsers.push({
		pattern: () => {
			return /\bChristmas\b/i;
		},
		extract: () => {
			return {
				day: 25,
				month: 12,
			};
		},
	});

	localizedChrono.parsers.push({
		pattern: () => new RegExp(ORDINAL_NUMBER_PATTERN),
		extract: (_context, match) => {
			return {
				day: parseOrdinalNumberPattern(match[0]),
				month: window.moment().month(),
			};
		},
	} as Parser);
	return localizedChrono;
}

export default class NLDParser {
	chrono: Chrono;

	constructor() {
		this.chrono = getConfiguredChrono();
	}

	getParsedDate(selectedText: string, weekStartPreference: DayOfWeek, format: string): Date | string | null {
		const parser = this.chrono;
		const initialParse = parser.parse(selectedText);
		const weekdayIsCertain = initialParse[0]?.start.isCertain("weekday");

		const thisDateMatch = selectedText.match(/this\s([\w]+)/i);
		const nextDateMatch = selectedText.match(/next\s([\w]+)/i);
		const lastDayOfMatch = selectedText.match(/(last day of|end of)\s*([^\n\r]*)/i);
		const midOf = selectedText.match(/mid\s([\w]+)/i);

		const referenceDate = weekdayIsCertain
			? window.moment().weekday(0).toDate()
			: new Date();

		if (thisDateMatch && ["week", "month", "year"].contains(thisDateMatch[1])) {
			return moment().locale('fa').endOf(thisDateMatch[1] as unitOfTime.StartOf).format(format);
		}

		if (nextDateMatch && ["week", "month", "year"].contains(nextDateMatch[1])) {
			return moment().locale('fa').add(1, nextDateMatch[1] as DurationInputArg2).format(format);
		}

		if (lastDayOfMatch) {
			const tempDate = parser.parse(lastDayOfMatch[2]);
			const year = tempDate[0].start.get("year");
			const month = tempDate[0].start.get("month");
			const lastDay = getLastDayOfMonth(year!, month!);

			return moment(`${year}-${month}-${lastDay}`).locale('fa').format('YYYY/MM/DD');
		}

		if (midOf) {
			return parser.parseDate(`${midOf[1]} 15th`, new Date(), {
				forwardDate: true,
			});
		}

		return parser.parseDate(selectedText, referenceDate, /*{ locale }*/);
	}
}
