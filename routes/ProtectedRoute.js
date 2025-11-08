import React, { Children, useEffect} from 'react';
import { useNaviagate } from 'react-router-dom';

const ProtectedRoutes = ({ Children}) => {

    const isAuthenticated = false ;
    const navigate = useNaviagate();

    useEffect (() =>{
        if (!isAuthenticated) navigate ('/login')

    },[])

    return (
        Children
    )
}

export default ProtectedRoutes