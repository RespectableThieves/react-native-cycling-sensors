import {
  Platform,
  NativeModules,
  NativeEventEmitter,
  EmitterSubscription,
  PermissionsAndroid
} from 'react-native';
import { Buffer } from "buffer";
import BleManager, { Peripheral } from 'react-native-ble-manager';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

// BLE service UUIDs we are interested in:
// Heart Rate service = 180D
// Battery Service = 180F
// Cycling Power service = 1818
// Running Speed and Cadence service = 1814
// Cycling Speed and Cadence service = 1816
// Device Information service = 180A
// Sensor Location = 2a5d
enum SupportedBleServices {
  Battery = '180f',
  HeartRate = '180d',
  CyclingPower = '1818',
  CyclingSpeedAndCadence = '1816',
  RunningSpeedAndCadence = '1814',
  SensorLocation = '2a5d'
}

class BleCycling { 
  isConnecting: boolean;
  bluetoothState: string;
  peripheralIds: string[];

  constructor() {
    this.isConnecting = false;
    this.bluetoothState = 'off';
    this.peripheralIds = []
  }

  enableBluetooth() : Promise<boolean> {
      return new Promise((resolve, reject) => {
          BleManager.enableBluetooth()
      .then(() => {
        console.log('The bluetooh is already enabled or the user confirm');
              resolve(true)
      })
      .catch((err: Error) => {
        console.log('The user refused to enable bluetooth: '+ err);
              reject(err)
      });
      });
  }

  addListener(listnerName: string, func: any ) : EmitterSubscription{
      return bleManagerEmitter.addListener(listnerName,func);
  }

  removeListeners(listners: EmitterSubscription[]) : void{
      listners.forEach(function(listner){
          listner.remove()
      })
  }

  checkState(): void {
      BleManager.checkState();
  }

  start() : Promise<boolean> {
      return new Promise((resolve, reject) => {
          BleManager.start({showAlert: false})
          .then( ()=>{
              this.checkState();
              console.log('BleManager successfully started'); 
              resolve(true)               
          }).catch(err=>{
              console.log('BleManager failed to start: '+ err);
              reject(err)
          });
      });
  }

  requestPermissions(): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (Platform.OS === 'android' && Platform.Version >= 23) {
            PermissionsAndroid.requestMultiple(
              [ 
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
              ).then((result) => {
                if (result['android.permission.ACCESS_FINE_LOCATION']
                && result['android.permission.ACCESS_COARSE_LOCATION']
                && result['android.permission.BLUETOOTH_SCAN']
                && result['android.permission.BLUETOOTH_CONNECT'] === 'granted') {
                  resolve(true);
                  console.log("Permissions already granted")
                } else {
                  PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
                  ]).then((result) =>{
                    if (result) {
                      console.log("User accept");
                      resolve(true)
                    } else {
                      console.log("User refuse");
                      reject(false)
                    }
                  });
                }
              });
          }
    });
  }

  scan(scanTime: number = 5)  {
      // We only scan for the devices with serviceUUIDs we support.
      const serviceUUIDs = Object.values(SupportedBleServices);
      console.log(serviceUUIDs)
      return new Promise((resolve, reject) => {
          BleManager.scan([], scanTime, true)
              .then( () => {
                  console.log('Scan started');
                  resolve(true);
              }).catch( (err: Error)=>{
                console.log('Scan started fail');
                reject(err);
            });
      });
  }

  stopScan() : Promise<boolean> {
      return new Promise((resolve, reject) => {
          BleManager.stopScan()
          .then(() => {
              console.log('Scan stopped');
              resolve(true)
          }).catch((err)=>{
            console.log('Scan stopped fail',err);
              reject(err)
        });
      });
  }

  getDiscoveredPeripherals() : Promise<Peripheral[]> {
      return new Promise( (resolve, reject) =>{
          BleManager.getDiscoveredPeripherals()
              .then((peripheralsArray: Peripheral[]) => {
                  console.log('Discovered peripherals: ', peripheralsArray);
                  resolve(peripheralsArray);
              })
              .catch((err: Error) => {
                  console.log('Error getting discovered peripherals: '+ err)
                  reject(err)
              });
      });
  }  

  connect(id: string) : Promise<BleManager.PeripheralInfo> {
      this.isConnecting = true;  
      return new Promise( (resolve, reject) =>{
          BleManager.connect(id)
              .then(() => {
                  console.log('Connected success.');
                  return BleManager.retrieveServices(id);                    
              })
              .then((peripheralInfo)=>{
                  console.log('Connected peripheralInfo: ', peripheralInfo);                    
                  this.peripheralIds.push(peripheralInfo.id);
                  this.isConnecting = false;    
                  resolve(peripheralInfo);
              })
              .catch(error=>{
                  console.log('Connected error:',error);
                  this.isConnecting = false;   
                  reject(error);
              });
      });
  }

  getConnectedPeripherals() : Promise<BleManager.Peripheral[]> {
      return new Promise((resolve, reject) => {
          BleManager.getConnectedPeripherals([])
          .then((peripheralsArray) => {
              console.log('Connected peripherals: ', peripheralsArray);
              resolve(peripheralsArray)
          }).catch(err=>{
              console.log("Error getting connected peripherals list: "+ err)
              reject(err)
          })
      });
  }

  disconnect(peripheralId: string) : Promise<boolean> {
      return new Promise((resolve, reject) => {
          BleManager.disconnect(peripheralId)
      .then( () => {
        console.log('Disconnected');
              this.peripheralIds = this.peripheralIds.filter(item => item !== peripheralId);
              resolve(true)
      })
      .catch((err) => {
        console.log('Disconnected error:',err);
              reject(err)
      }); 
      });
         
  }

  disconnectAll(): Promise<boolean> {
      return new Promise((resolve, reject) => {
          this.peripheralIds.forEach((peripheral, index, array) => {
              this.disconnect(peripheral)
              .then( () => {
                  console.log("Disconnected: "+ peripheral)
              })
              .catch((err) => {
                  reject(err)
              })
          })
          resolve(true)
      })
  }

  startNotification(peripheralId: string, serviceUUID: string, charUUID: string) : Promise<boolean> {
      return new Promise( (resolve, reject) =>{
          BleManager.startNotification(peripheralId, serviceUUID, charUUID)
              .then(() => {
                  console.log('Notification started');
                  resolve(true);
              })
              .catch((err) => {
                  console.log('Notification error:',err);
                  reject(err);
              });
      });
  }

  stopNotification(peripheralId: string, serviceUUID: string, charUUID: string) : Promise<boolean> { 
      return new Promise( (resolve, reject) => {
          BleManager.stopNotification(peripheralId, serviceUUID, charUUID)
          .then(() => {
              console.log('stopNotification success!');
              resolve(true);
          })
          .catch((err) => {
              console.log('stopNotification error:',err);
              reject(err);
          });
      });
  }

  isPeripheralConnected(peripheralId: string){
      return new Promise( (resolve, reject) =>{
          BleManager.isPeripheralConnected(peripheralId, [])
              .then((isConnected) => {
                  resolve(isConnected);
                  if (isConnected) {                        
                      console.log('Peripheral is connected!');
                  } else {
                      console.log('Peripheral is NOT connected!');
                  }
              }).catch(err=>{
                  reject(err);
              })
      });
  }

  // Removes a disconnected peripheral from the cached list. 
  removePeripheral(peripheralId: string) : Promise<boolean> {
      return new Promise( (resolve, reject) =>{
          BleManager.removePeripheral(peripheralId)
              .then(()=>{
                  this.peripheralIds = this.peripheralIds.filter(item => item !== peripheralId);
                  resolve(true);
              })
              .catch(err=>{
                  reject(err);
              })      
      });  
  }

}

class PowerMeters extends BleCycling {

}

class HeartRateMonitors extends BleCycling {

}

class CadenceSensors extends BleCycling {
  
}

export { BleCycling, PowerMeters }