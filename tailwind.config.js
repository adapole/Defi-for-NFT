module.exports = {
	content: [
		'./pages/**/*.{js,ts,jsx,tsx}',
		'./components/**/*.{js,ts,jsx,tsx}',
	],
	theme: {
		extend: {
			animation: {
				tilt: 'tilt 10s infinite linear',
			},
			keyframes: {
				tilt: {
					'0%, 50%, 100%': {
						transform: 'rotate(0deg)',
					},
					'25%': {
						transform: 'rotate(2deg)',
					},
					'75%': {
						transform: 'rotate(-2deg)',
					},
				},
			},
			screens: {
				'3xl': '2000px',
			},
			minHeight: {
				2: '200px',
			},
			height: {
				'95-px': '95px',
				'70-px': '70px',
				'350-px': '350px',
				'500-px': '500px',
				'600-px': '600px',
			},
		},
	},
	plugins: [require('tailwind-scrollbar-hide')],
};
