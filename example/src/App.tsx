import React, { useEffect, useState } from 'react'
import { Button, EmitterSubscription, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { PowerMeters } from 'react-native-cycling-sensors'

const App = () => {
  const [isScanning, setIsScanning] = useState(false); 
  const bleDevices = new PowerMeters() 
  
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const startScan = () => {
    if (!isScanning) {
      bleDevices.scan().then(() => {
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
  }

  const handleUpdateValueForCharacteristic = (data: any) => {
    let charType = bleDevices.getCharacteristicType(data.characteristic)
    console.log(charType)
    switch (charType) {
      case 'CyclingPowerMeasurement':
        let dataArray = new Uint8Array(data.value)
        let powerData = bleDevices.parseCyclingPowerMeasurement(dataArray)
        console.log(powerData)
        break;
      case 'CyclingPowerVector':
        console.log(data.value)
        break;
      default:
        console.log('Unknown data')
        break;
    }
  }

  useEffect(() => {
    let subscriptionStopScan: EmitterSubscription
    let subscriptionDiscover: EmitterSubscription
    let subscriptionUpdateValueForChar: EmitterSubscription

    const startBleSensors = async () => {
      await bleDevices.requestPermissions()
      await bleDevices.start()
      subscriptionUpdateValueForChar = bleDevices.addListener('BleManagerDidUpdateValueForCharacteristic', handleUpdateValueForCharacteristic );
      subscriptionStopScan = bleDevices.addListener('BleManagerStopScan', handleStopScan);
      subscriptionDiscover = bleDevices.addListener('BleManagerDiscoverPeripheral', handleDiscoverPeripheral)
      
      await bleDevices.scan()
      await sleep(10000)
      let discoveredDevices = await bleDevices.getDiscoveredPeripherals();
      if (discoveredDevices.length >= 1){
        console.log('First device found: ', discoveredDevices[0])
        try {
          await bleDevices.connect(discoveredDevices[0].id)
          await bleDevices.startInstantPowerNotification(discoveredDevices[0].id)
          await bleDevices.startPowerVectorNotification(discoveredDevices[0].id)
        } catch(err) {
          console.log('error starting notif')
        }       
        await sleep(5000)
        try {
          await bleDevices.stopInstantPowerNotification(discoveredDevices[0].id)
          await bleDevices.stopPowerVectorNotification(discoveredDevices[0].id)
        } catch(err) {
          console.log('error starting notif')
        }
        
        await sleep(3000)
        await bleDevices.disconnectAll()
      }
      

    };
  
    startBleSensors(); // run it, run it
  
    return () => {
      // this now gets called when the component unmounts
      bleDevices.removeListeners([subscriptionStopScan, subscriptionDiscover]);
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
