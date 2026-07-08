import { useContext } from 'react';
import { AuthContext } from './JwtContext';

//import { AuthContext } from '../jwt/JwtContext';
//import { AuthContext } from '../auth0/Auth0Context';

const useAuth = () => useContext(AuthContext);

export default useAuth;
