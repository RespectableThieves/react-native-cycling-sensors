import React, { useEffect, useState } from 'react'
import { Button, EmitterSubscription, NativeEventEmitter, NativeModules, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { PowerMeters } from 'react-native-cycling-sensors'

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const App = () => {
  const [isScanning, setIsScanning] = useState(false); 
  const powerMeters = new PowerMeters() 

  const startScan = () => {
    if (!isScanning) {
      powerMeters.scan().then(() => {
        console.log('Scanning...');
        setIsScanning(true);
      }).catch(err => {
        console.error(err);
      });
    }    
  }

  const handleDiscoverPeripheral = (peripheral: any) => {
    console.log(peripheral);
  }

  const handleStopScan = () => {
    console.log('Scan is stopped');
    setIsScanning(false);
    powerMeters.getDiscoveredPeripherals().then((devices) => {
      console.log(devices)
    })
  }

  useEffect(() => {
    let subscriptionStopScan: EmitterSubscription
    let subscriptionDiscover: EmitterSubscription

    const startBleSensors = async () => {
      await powerMeters.requestPermissions()
      await powerMeters.start()
      subscriptionStopScan = powerMeters.addListener('BleManagerStopScan', handleStopScan);
      subscriptionDiscover = powerMeters.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral)

    };
  
    startBleSensors(); // run it, run it
  
    return () => {
      // this now gets called when the component unmounts
      powerMeters.removeListeners([subscriptionStopScan, subscriptionDiscover]);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <Text>Testing...</Text>
        <Button 
                title={'Scan Bluetooth (' + (isScanning ? 'on' : 'off') + ')'}
                onPress={() => startScan() } 
              />  
      </View>
    </SafeAreaView> 
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  title: {
    textAlign: 'center',
    marginVertical: 8,
  },
  fixToText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  separator: {
    marginVertical: 8,
    borderBottomColor: '#737373',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export default App;
