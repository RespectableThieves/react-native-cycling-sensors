import React, { useEffect, useState } from 'react'
import { Button, EmitterSubscription, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { PowerMeters, BleSensors, PowerMeter, CadenceMeter } from 'react-native-cycling-sensors'

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

  const handlePowerData = (data: any) => {
    console.log('Power: ', data)
  }

  const handleCscData = (data: any) => {
    console.log('CSC: ', data)
  }


  // const handleStopScan = () => {
  //   console.log('Scan is stopped');
  //   setIsScanning(false);
  // }

  // const handleUpdateValueForCharacteristic = (data: any) => {
  //   let charType = bleDevices.getCharacteristicType(data.characteristic)
  //   console.log(charType)
  //   switch (charType) {
  //     case 'CyclingPowerMeasurement':
  //       let dataArray = new Uint8Array(data.value)
  //       let powerData = bleDevices.parseCyclingPowerMeasurement(dataArray)
  //       console.log(powerData)
  //       break;
  //     case 'CyclingPowerVector':
  //       console.log(data.value)
  //       break;
  //     default:
  //       console.log('Unknown data')
  //       break;
  //   }
  // }

  useEffect(() => {
    let subscriptionStopScan: EmitterSubscription
    let subscriptionDiscover: EmitterSubscription

    const startBleSensors = async () => {
      const bleSensor = new BleSensors()
      await bleSensor.requestPermissions()
      await bleSensor.start()
      await bleSensor.startSensorDiscovery()
      await bleSensor.subscribeToDiscovery(handleDiscoverPeripheral)
      await sleep(10000)
      const sensorList = await bleSensor.getDiscoveredSensors()
      console.log(sensorList)
      const pm = new PowerMeter(sensorList.CyclingPower[0]?.id)
      const csc = new CadenceMeter(sensorList.CyclingPower[0]?.id)
      await pm.connect()
      await csc.connect()
      await pm.subscribe(handlePowerData)
      await csc.subscribe(handleCscData)
      await sleep(5000)
      await pm.disconnect()
      await csc.disconnect()
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
