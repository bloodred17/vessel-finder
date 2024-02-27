import {getModelForClass, index, modelOptions, prop} from "@typegoose/typegoose";


@modelOptions({
  schemaOptions: { collection: 'vessels' }
})
@index(
  { date: -1 },
)
export class VesselSchema {
  @prop({type: String})
  imo_number: string | undefined;

  @prop({type: String})
  vessel_name: string | undefined;

  @prop({type: String})
  ship_type: string | undefined;

  @prop({type: String})
  flag: string | undefined;

  @prop({type: String})
  gross_tonnage: string | undefined;

  @prop({type: String})
  length_overall: string | undefined;

  @prop({type: String})
  year_of_build: string | undefined;

  @prop({type: String})
  mmsi: string | undefined;

  @prop({type: String})
  callsign?: string | undefined;

  @prop({type: Date})
  created_at?: Date;

  @prop({type: Date})
  updated_at?: Date;

  constructor(init?: VesselSchema) {
    if (init) {
      Object.assign(this, init);
    }
  }

  static get model() {
    return getModelForClass(VesselSchema);
  }
}