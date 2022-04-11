import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
	value: PropTypes.string.isRequired,
	handleItemRemove: PropTypes.func.isRequired,
	deleteButton: PropTypes.node.isRequired,
};

const MultipleValueTextInputItem = (props) => {
	const { value, handleItemRemove, deleteButton } = props;
	return (
		<span className='p-1 mr-1 bg-[#d6d6da] hover:bg-[#2CB7BC] rounded-md'>
			{value}{' '}
			<span
				className='h-5 text-white cursor-pointer'
				data-value={value}
				tabIndex='-1'
				role='button'
				onKeyPress={() => handleItemRemove(value)}
				onClick={() => handleItemRemove(value)}
			>
				{deleteButton}
			</span>
		</span>
	);
};

MultipleValueTextInputItem.propTypes = propTypes;
export default MultipleValueTextInputItem;
