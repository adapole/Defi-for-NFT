import React from 'react';
import Chart from 'chart.js/auto';

export default function CardPieChart() {
	const CHART_COLORS = {
		red: 'rgb(255, 99, 132)',
		orange: 'rgb(255, 159, 64)',
		yellow: 'rgb(255, 205, 86)',
		green: 'rgb(75, 192, 192)',
		blue: 'rgb(54, 162, 235)',
		purple: 'rgb(153, 102, 255)',
		grey: 'rgb(201, 203, 207)',
	};
	React.useEffect(() => {
		const DATA_COUNT = 5;
		const NUMBER_CFG = { count: DATA_COUNT, min: 0, max: 100 };

		const data = {
			labels: ['LFT-Jina', 'Gruss', 'Pony', 'Green', 'Others'],
			datasets: [
				{
					label: 'Dataset 1',
					data: [300, 50, 100, 85, 245],
					backgroundColor: Object.values(CHART_COLORS),
				},
			],
		};
		const config = {
			type: 'doughnut',
			data: data,
			options: {
				maintainAspectRatio: false,
				responsive: true,
				plugins: {
					legend: {
						position: 'top',
					},
					title: {
						display: false,
						text: 'Percentage of TVP per asset',
					},
				},
			},
		};

		let ctx = document.getElementById('doughnut-chart') as HTMLCanvasElement;
		(window as any).myDoughnut = new Chart(ctx, config);
	}, []);
	return (
		<>
			{/* shadow-lg rounded */}
			<div className='relative flex flex-col min-w-0 break-words bg-none w-full mb-6 '>
				<div className='rounded-t mb-0 px-4 py-3 bg-transparent'>
					<div className='flex flex-wrap items-center'>
						<div className='relative w-full max-w-full flex-grow flex-1'>
							<h6 className='uppercase mb-1 text-xs font-semibold'>
								{'USDC 500K'}
							</h6>
							<h2 className=' text-xl font-semibold'>Total Value Promised</h2>
						</div>
					</div>
				</div>
				<div className='p-4 flex-auto'>
					{/* Chart */}
					<div className='relative h-350-px'>
						<canvas id='doughnut-chart'></canvas>
					</div>
				</div>
			</div>
		</>
	);
}
