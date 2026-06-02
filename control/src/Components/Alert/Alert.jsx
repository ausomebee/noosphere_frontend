import React from 'react';
import PropTypes from 'prop-types';
import './Alert.css';
import Button from '../Button/Button'; // Assuming you have a Button component

const Alert = ({
  message,
  variant = 'default',
  primaryAction,
  secondaryAction,
}) => {
  return (
    <div className={`alert alert-${variant}`}>
      <span className="alert-message">{message}</span>
      <div className="alert-actions">
        {primaryAction && (
          <Button
            label={primaryAction.label}
            variant="primary"
            onClick={primaryAction.onClick}
          />
            
         
        )}
        {secondaryAction && (
          <Button
            label={secondaryAction.label}
            variant="secondary"
            onClick={secondaryAction.onClick}
          />
          
        )}
      </div>
    </div>
  );
};

Alert.propTypes = {
  message: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['default', 'info', 'warning', 'danger']),
  primaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
  }),
  secondaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
  }),
};

export default Alert;
