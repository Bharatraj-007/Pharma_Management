import React from 'react';
import DispatchScreenWebPortal from '../../../frontend-webui/screens/DispatchScreen.web';
import { useDispatchLogic } from './useDispatchLogic';

export default function DispatchScreen() {
  const { session } = useDispatchLogic();
  return <DispatchScreenWebPortal apiBaseUrl={require('../../config').default} session={session} />;
}
