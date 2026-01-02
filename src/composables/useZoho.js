export function useZoho() {
  const init = async () => {
    return new Promise((resolve) => {
      // eslint-disable-next-line no-undef
      ZOHO.embeddedApp.on("PageLoad", async (data) => {
        // await resize() // не работает на вебтабе
        resolve(data)
      })
      // eslint-disable-next-line no-undef
      ZOHO.embeddedApp.init()
    })
  }

  const resize = async () => {
    // eslint-disable-next-line no-undef
    await ZOHO.CRM.UI.Resize({
      height: "3000",
      width: "3000"
    })
  }

  const getRecords = async (module) => {
    try {
      // eslint-disable-next-line no-undef
      const response = await ZOHO.CRM.API.getAllRecords({ Entity: module })
      return response?.data || []
    } catch (e) {
      console.error("Zoho SDK error:", e)
      return []
    }
  }

  const getRecordById = async (module,id) => {
    try {
      // eslint-disable-next-line no-undef
    const response = await ZOHO.CRM.API.getRecord({
      Entity:module,
      RecordID: id
    })
    return response?.data[0] || []
    } catch (e) {
      console.error("Zoho SDK error:", e)
      return []
    }
  }

  const getRecordsCoql = async (query) => {
    try {
      // eslint-disable-next-line no-undef
      const response = await ZOHO.CRM.API.coql(query)
      return response?.data || []
    } catch (e) {
      console.error("Zoho SDK error:", e)
      return []
    }
  }

  const getRecordsCoqlAll = async (query) => {
    try {
      const allData = []
      const pageSize = 200
      let offset = 0
      let moreRecords = true

      while (moreRecords) {
        const baseSql = query.select_query.replace(/\slimit\s+\d+(\soffset\s+\d+)?/i, "")
        const pagedQuery = {
          ...query,
          select_query: `${baseSql} limit ${pageSize} offset ${offset}`
        }

        // eslint-disable-next-line no-undef
        const response = await ZOHO.CRM.API.coql(pagedQuery)

        if (response?.data?.length) {
          allData.push(...response.data)
          offset += pageSize
        } else {
          moreRecords = false
        }
      }

      return allData
    } catch (e) {
      console.error("Zoho SDK error:", e)
      return []
    }
  }

  const createRecord = async (module,data,trigger = []) => {
    try {
    // eslint-disable-next-line no-undef
    const response = await ZOHO.CRM.API.insertRecord({
      Entity:module,
      APIData:data,
      Trigger: trigger // example[ "workflow" ]
    });
    return response?.data || []
    } catch (e) {
      console.error("Zoho SDK error:", e)
      return []
    }
  }

  return { init, resize, getRecords, getRecordsCoql, getRecordsCoqlAll,createRecord,getRecordById }
}
