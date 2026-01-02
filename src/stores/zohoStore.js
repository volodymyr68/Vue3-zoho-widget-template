import { defineStore } from 'pinia'
import { useZoho } from '@/composables/useZoho'

export const useZohoStore = defineStore('zoho', {
  state: () => ({
    pageInfo: null,
    drivers: [],
    schedules:[],
    vechicles:[],
    schedule:[],
    loading: false,
  }),

  actions: {
    async initApp() {
      const { init } = useZoho()
      this.pageInfo = await init()
    },
    async fetchDriversCoql(){
      this.loading = true
      const { getRecordsCoqlAll } = useZoho()
      const query = {
        "select_query": "select Last_Name, First_Name, Full_Name from Contacts where contactType in ('taxikar','Водитель') and Status != 'Fired'"
      }

      this.drivers = await getRecordsCoqlAll(query)
      this.loading = false
    },

    async fetchDriversScheduleCoql(startDate,endDate){
      this.loading = true
      const { getRecordsCoqlAll } = useZoho()
      const query = {
        select_query: `select Name, Start_of_work_shift, End_of_work_shift, Status, Type_of_work_shift, Driver,Auto from Taxi_Schedules where Start_of_work_shift between '${startDate}' and '${endDate}' order by Start_of_work_shift`
      }
      this.schedules = await getRecordsCoqlAll(query)
      this.loading = false
    },

    async fetchVehicelsCoql() {
      this.loading = true
      const { getRecordsCoqlAll } = useZoho()
      const query = {
        select_query: `select Name,VIN_Code,Currency,Track_Mark,Mileage from Auto where Tag like '%Taxi%'` //TODO: CHANGE TO Taxi
      }
      this.vechicles = await getRecordsCoqlAll(query)
      this.loading = false
    },

    async getDriverScheduleById(id){
      const { getRecordById } = useZoho()
      this.schedule = await getRecordById("Taxi_Schedules",id)
    }
  },
})
