import { BleCycling, SupportedBleServices } from "./bleCycling";

type CSCMeasurement = {
    cumulativeWheelRevs: number | null,
    lastWheelEventTime: number | null,
    cumulativeCrankRevs: number | null,
    lastCrankEventTime: number | null
  }
  
type CSCFeature = {
    wheelRevSupported: boolean,
    crankRevSupported: boolean,
    multipleLocationsSupported: boolean
  }

type CyclingPowerMeasurement = {
    instantaneous_power: number;
    pedal_power_balance: number | null;
    accumulated_torque: number | null;
    cumulative_wheel_revs: number | null;
    last_wheel_event_time: number | null;
    cumulative_crank_revs: number | null;
    last_crank_event_time: number | null;
    maximum_force_magnitude: number | null;
    minimum_force_magnitude: number | null;
    maximum_torque_magnitude: number | null;
    minimum_torque_magnitude: number | null;
    top_dead_spot_angle: number | null;
    bottom_dead_spot_angle: number | null;
    accumulated_energy: number | null;
  };

type CyclingPowerVector = {
    instantaneous_measurement_direction: InstantaneousMeasurementDirection,
    cumulative_crank_revs?: number,
    last_crank_event_time?: number,
    first_crank_measurement_angle?: number,
    instantaneous_force_magnitudes: number[],
    instantaneous_torque_magnitudes: number[]
  };
  
enum InstantaneousMeasurementDirection {
    unknown,
    tangential_component,
    radial_component,
    lateral_component
  };

class PowerMeters extends BleCycling {
    serviceUUID: string;

    constructor() {
        let serviceUUID = SupportedBleServices.CyclingPower
        super([serviceUUID])
        this.serviceUUID = serviceUUID
    }

    startInstantPowerNotification(peripheralId: string) : Promise<boolean> {
        return new Promise((resolve, reject) => {
        super.startNotification(peripheralId, this.serviceUUID, '2a63')
        .then(() => {
            console.log('Notifications started on Instantaneous Power');
            resolve(true)
        })
        .catch((err) => {
            reject(err)
        })
        }); 
    }

    stopInstantPowerNotification(peripheralId: string) : Promise<boolean> { 
        return new Promise( (resolve, reject) => {
        super.stopNotification(peripheralId, this.serviceUUID, '2a63')
        .then(() => {
            console.log('Notifications stopped on Instantaneous Power')
            resolve(true)
        })
        .catch((err) => {
            reject(err)
        })
        });
    }

    startPowerVectorNotification(peripheralId: string) : Promise<boolean> {
        return new Promise((resolve, reject) => {
        super.startNotification(peripheralId, this.serviceUUID, '2a64')
        .then(() => {
            console.log('Notifications started on Power Vector');
            resolve(true)
        })
        .catch((err) => {
            reject(err)
        })
        }); 
    }

    stopPowerVectorNotification(peripheralId: string) : Promise<boolean> { 
        return new Promise( (resolve, reject) => {
        super.stopNotification(peripheralId, this.serviceUUID, '2a64')
        .then(() => {
            console.log('Notifications stopped on Power Vector')
            resolve(true)
        })
        .catch((err) => {
            reject(err)
        })
        });
    }

    parseCSCMeasurement(data: number[]): CSCMeasurement {
        const flags = data[0]? data[0] : 0;
        const wheelRevIncludedFlag = 1;
        const crankRevIncludedFlag = 2;
      
        let cumulativeWheelRevs: number | null = null;
        let lastWheelEventTime: number | null = null;
        let cumulativeCrankRevs: number | null = null;
        let lastCrankEventTime: number | null = null;
      
        let byteOffset = 1;
        if (flags & wheelRevIncludedFlag) {
            cumulativeWheelRevs = data.slice(byteOffset, 4 + byteOffset).reduce((p, c, i) => p + (c << (i * 8)), 0);
            lastWheelEventTime = data.slice(4 + byteOffset, 6 + byteOffset).reduce((p, c, i) => p + (c << (i * 8)), 0);
            byteOffset += 6;
        }
      
        if (flags & crankRevIncludedFlag) {
            cumulativeCrankRevs = data.slice(byteOffset, 2 + byteOffset).reduce((p, c, i) => p + (c << (i * 8)), 0);
            lastCrankEventTime = data.slice(2 + byteOffset, 4 + byteOffset).reduce((p, c, i) => p + (c << (i * 8)), 0);
        }
      
        return {
            cumulativeWheelRevs,
            lastWheelEventTime,
            cumulativeCrankRevs,
            lastCrankEventTime
        };
    }
      
    parseCSCFeature(measurement: Buffer): CSCFeature {
        const value = measurement.readUInt16LE(0);
        const wheelRevSupported = (value & 0b1) !== 0;
        const crankRevSupported = (value & 0b10) !== 0;
        const multipleLocationsSupported = (value & 0b100) !== 0;
        return {
          wheelRevSupported,
          crankRevSupported,
          multipleLocationsSupported
        };
    }
        
    parseCyclingPowerMeasurement(data: Uint8Array): CyclingPowerMeasurement {
        const flags = new DataView(data.buffer, data.byteOffset, 2).getUint16(0, true);
      
        const pedal_power_balance_included_flag = 1;
        const accumulated_torque_present = 1 << 2;
        const wheel_rev_included_flag = 1 << 4;
        const crank_rev_included_flag = 1 << 5;
        const extreme_force_included_flag = 1 << 6;
        const extreme_torque_included_flag = 1 << 7;
        const extreme_angles_included_flag = 1 << 8;
        const top_dead_spot_included_flag = 1 << 9;
        const bottom_dead_spot_included_flag = 1 << 10;
        const accumulated_energy_included_flag = 1 << 11;
      
        let byte_offset = 2;
      
        const instantaneous_power = new DataView(data.buffer, data.byteOffset + byte_offset, 2).getUint16(0, true);
        let pedal_power_balance = null;
        let accumulated_torque = null;
        let cumulative_wheel_revs = null;
        let last_wheel_event_time = null;
        let cumulative_crank_revs = null;
        let last_crank_event_time = null;
        let maximum_force_magnitude = null;
        let minimum_force_magnitude = null;
        let maximum_torque_magnitude = null;
        let minimum_torque_magnitude = null;
        let top_dead_spot_angle = null;
        let bottom_dead_spot_angle = null;
        let accumulated_energy = null;
      
        byte_offset += 2;
        if (flags & pedal_power_balance_included_flag) {
            pedal_power_balance = data[byte_offset];
            byte_offset += 1;
        }
      
        if (flags & accumulated_torque_present) {
            accumulated_torque = new DataView(data.buffer, data.byteOffset + byte_offset, 2).getUint16(0, true);
            byte_offset += 2;
        }
      
        if (flags & extreme_angles_included_flag) {
          // TODO: Implement extreme angles
          byte_offset += 3;
        }
        
        if (flags & top_dead_spot_included_flag) {
          const top_dead_spot_angle = new DataView(data.slice(byte_offset, byte_offset + 2)).getInt16(0, true);
          byte_offset += 2;
        }
        
        if (flags & bottom_dead_spot_included_flag) {
          const bottom_dead_spot_angle = new DataView(data.slice(byte_offset, byte_offset + 2)).getInt16(0, true);
          byte_offset += 2;
        }
        
        if (flags & accumulated_energy_included_flag) {
          const accumulated_energy = new DataView(data.slice(byte_offset, byte_offset + 2)).getInt16(0, true);
        }
      
        return {
          instantaneous_power,
          accumulated_energy,
          pedal_power_balance,
          accumulated_torque,
          cumulative_wheel_revs,
          last_wheel_event_time,
          cumulative_crank_revs,
          last_crank_event_time,
          maximum_force_magnitude,
          minimum_force_magnitude,
          maximum_torque_magnitude,
          minimum_torque_magnitude,
          top_dead_spot_angle,
          bottom_dead_spot_angle
        }
    }
      
    parseCyclingPowerVector(data: Uint8Array): CyclingPowerVector {
        let flags = data[0];
      
        let crank_revolutions_present = (flags & 0b1) !== 0;
        let first_crank_measurement_angle_present = (flags & 0b10) !== 0;
        let instantaneous_force_array_present = (flags & 0b100) !== 0;
        let instantaneous_torque_array_present = (flags & 0b1000) !== 0;
        let instantaneous_measurement_direction_value = (flags & 0b110000) >> 4;
      
        let instantaneous_measurement_direction = InstantaneousMeasurementDirection.unknown;
        if (instantaneous_measurement_direction_value === 1) {
          instantaneous_measurement_direction = InstantaneousMeasurementDirection.tangential_component;
        } else if (instantaneous_measurement_direction_value === 2) {
          instantaneous_measurement_direction = InstantaneousMeasurementDirection.radial_component;
        } else if (instantaneous_measurement_direction_value === 3) {
          instantaneous_measurement_direction = InstantaneousMeasurementDirection.lateral_component;
        }
      
        let byte_offset = 1;
        let cumulative_crank_revs: number | null;
        let last_crank_event_time: number | null;
        let first_crank_measurement_angle: number | null;
        let instantaneous_force_magnitudes: number[] = [];
        let instantaneous_torque_magnitudes: number[] = [];
      
        if (crank_revolutions_present) {
          cumulative_crank_revs = new DataView(data.buffer, data.byteOffset + byte_offset, 2).getUint16(0, true);
          byte_offset += 2;
          last_crank_event_time = new DataView(data.buffer, data.byteOffset + byte_offset, 2).getUint16(0, true);
          byte_offset += 2;
        }
      
        if (first_crank_measurement_angle_present) {
          first_crank_measurement_angle = new DataView(data.buffer, data.byteOffset + byte_offset, 2).getUint16(0, true);
          byte_offset += 2;
        }
      
        for (let i = byte_offset; i < data.length; i += 2) {
          let element = new DataView(data.buffer, data.byteOffset + i, 2).getUint16(0, true);
          if (instantaneous_force_array_present) {
              instantaneous_force_magnitudes.push(element);
          } else if (instantaneous_torque_array_present) {
              instantaneous_torque_magnitudes.push(element);
          }
        }
      
        return {
            instantaneous_measurement_direction,
            cumulative_crank_revs,
            last_crank_event_time,
            first_crank_measurement_angle,
            instantaneous_force_magnitudes,
            instantaneous_torque_magnitudes
        };
      
    }

}



export default PowerMeters