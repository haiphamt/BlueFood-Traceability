import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuth } from '../lib/auth-context';
import { LoginScreen } from '../screens/login-screen';
import { ScanScreen } from '../screens/scan-screen';
import { BatchSummaryScreen } from '../screens/batch-summary-screen';
import { ConfirmEventScreen } from '../screens/confirm-event-screen';
import { OfflineQueueScreen } from '../screens/offline-queue-screen';
import { AccountScreen } from '../screens/account-screen';

export type RootStackParamList = {
  Login: undefined;
  PublicScan: undefined;
  Main: undefined;
  BatchSummary: { batchCode: string };
  ConfirmEvent: {
    batchCode: string;
    eventType?: string;
    initialEventType?: string;
    mode?: 'receive' | 'issue' | 'sold' | 'generic';
    title?: string;
  };
};

export type MainTabParamList = {
  Scan: undefined;
  Queue: undefined;
  Account: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#15231b' },
        headerTintColor: '#ffffff',
        tabBarStyle: { backgroundColor: '#15231b', borderTopColor: 'rgba(255,255,255,.1)' },
        tabBarActiveTintColor: '#70b98b',
        tabBarInactiveTintColor: '#8aaa96',
      }}
    >
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          title: 'Quét QR',
          tabBarLabel: 'Quét QR',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📷</Text>,
        }}
      />
      <Tab.Screen
        name="Queue"
        component={OfflineQueueScreen}
        options={{
          title: 'Hàng chờ',
          tabBarLabel: 'Hàng chờ',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Tài khoản',
          tabBarLabel: 'Tài khoản',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isLoggedIn } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="PublicScan"
              component={ScanScreen}
              options={{
                headerShown: true,
                title: 'Quét truy xuất',
                headerStyle: { backgroundColor: '#15231b' },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen
              name="BatchSummary"
              component={BatchSummaryScreen}
              options={{
                headerShown: true,
                title: 'Truy xuất lô hàng',
                headerStyle: { backgroundColor: '#15231b' },
                headerTintColor: '#fff',
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="BatchSummary"
              component={BatchSummaryScreen}
              options={{
                headerShown: true,
                title: 'Chi tiết lô hàng',
                headerStyle: { backgroundColor: '#15231b' },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen
              name="ConfirmEvent"
              component={ConfirmEventScreen}
              options={{
                headerShown: true,
                title: 'Xác nhận sự kiện',
                headerStyle: { backgroundColor: '#15231b' },
                headerTintColor: '#fff',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
