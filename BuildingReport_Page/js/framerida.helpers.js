/*
  Convenience helpers used in FrameRida.
*/

(function(H) {
	var states = {
		AL: 'Alabama',
		AK: 'Alaska',
		AZ: 'Arizona',
		AR: 'Arkansas',
		CA: 'California',
		CO: 'Colorado',
		CT: 'Connecticut',
		DE: 'Delaware',
		DC: 'District of Columbia',
		FL: 'Florida',
		GA: 'Georgia',
		HI: 'Hawaii',
		ID: 'Idaho',
		IL: 'Illinois',
		IN: 'Indiana',
		IA: 'Iowa',
		KS: 'Kansas',
		KY: 'Kentucky',
		LA: 'Louisiana',
		ME: 'Maine',
		MD: 'Maryland',
		MA: 'Massachusetts',
		MI: 'Michigan',
		MN: 'Minnesota',
		MS: 'Mississippi',
		MO: 'Missouri',
		MT: 'Montana',
		NE: 'Nebraska',
		NV: 'Nevada',
		NH: 'New Hampshire',
		NJ: 'New Jersey',
		NM: 'New Mexico',
		NY: 'New York',
		NC: 'North Carolina',
		ND: 'North Dakota',
		OH: 'Ohio',
		OK: 'Oklahoma',
		OR: 'Oregon',
		PA: 'Pennsylvania',
		RI: 'Rhode Island',
		SC: 'South Carolina',
		SD: 'South Dakota',
		TN: 'Tennessee',
		TX: 'Texas',
		UT: 'Utah',
		VT: 'Vermont',
		VA: 'Virginia',
		WA: 'Washington',
		WV: 'West Virginia',
		WI: 'Wisconsin',
		WY: 'Wymoing'
	};

	H.registerHelper('uppercase', function(item) {
		if (!item) return '';
		return item.toUpperCase();
	});

	/*
    To be used within an each statement. Returns iterated index starting at 1
    instead of 0.
  */
	H.registerHelper('index', function(item) {
		return item.data.index + 1;
	});

	H.registerHelper('socialCount', function(item) {
		if (!this.available_data_counts) {
			return;
		}
		var count = this.available_data_counts.url;
		if (count > 0) {
			return count.toString();
		} else {
			return '';
		}
	});

	H.registerHelper('emailCount', function(item) {
		if (!this.available_data_counts) {
			return;
		}
		var count = this.available_data_counts.email;
		if (count > 0) {
			return count.toString();
		} else {
			return '';
		}
	});

	H.registerHelper('photoCount', function(item) {
		if (!this.available_data_counts) {
			return;
		}
		var count = this.available_data_counts.image_url;
		if (count > 0) {
			return count.toString();
		} else {
			return '';
		}
	});

	H.registerHelper('phoneCount', function(item) {
		if (!this.available_data_counts) {
			return;
		}
		var count = this.available_data_counts.phone.total;
		if (count > 0) {
			return count.toString();
		} else {
			return '';
		}
	});

	H.registerHelper('extraCount', function(item) {
		if (!this.available_data_counts) {
			return;
		}
		var count = this.available_data_counts.job;
		if (count > 0) {
			return count.toString();
		} else {
			return '';
		}
	});

	H.registerHelper('name', function(item) {
		if (!this.available_data_counts) {
			return;
		}
		if (this.available_data_counts.name) {
			var firstName = this.names[0].parts.first_name;
			var middleInitial = this.names[0].parts.middle_name
				? this.names[0].parts.middle_name + '.'
				: '';

			var lastName = this.names[0].parts.last_name;
			var fullName = firstName + ' ' + middleInitial + ' ' + lastName;

			return fullName;
		}
	});
})(Handlebars);
