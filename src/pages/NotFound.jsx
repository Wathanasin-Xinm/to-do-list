import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="flex-center" style={{ height: '100vh', flexDirection: 'column' }}>
            <h1>404 - Page Not Found</h1>
            <Link to="/" className="btn" style={{ marginTop: '1rem' }}>Go Home</Link>
        </div>
    );
};

export default NotFound;
