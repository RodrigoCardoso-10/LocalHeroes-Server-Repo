import { Injectable } from '@nestjs/common';
import * as NodeGeocoder from 'node-geocoder';

@Injectable()
export class GeocodingService {
  private geocoder;

  constructor() {
    this.geocoder = NodeGeocoder({
      provider: 'openstreetmap',
    });
  }

  async geocode(
    address: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const res = await this.geocoder.geocode(address);
      if (res.length > 0) {
        return {
          latitude: res[0].latitude,
          longitude: res[0].longitude,
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }
}
