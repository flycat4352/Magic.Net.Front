import T from 'ant-design-vue/es/table/Table'
import { Object } from 'core-js'
import get from 'lodash.get'
import draggable from 'vuedraggable'
import columnSetting from './columnSetting'
import './index.less'

export default {
  components: {
    draggable, columnSetting
  },
  data () {
    return {
      needTotalList: [],

      selectedRows: [],
      selectedRowKeys: [],

      localLoading: false,
      localDataSource: [],
      localPagination: Object.assign({}, this.pagination),
      isFullscreen: false,
      customSize: this.size,
      columnsSetting: []
    }
  },
  props: Object.assign({}, T.props, {
    rowKey: {
      type: [String, Function],
      default: 'key'
    },
    data: {
      type: Function,
      required: true
    },
    pageNum: {
      type: Number,
      default: 1
    },
    pageSize: {
      type: Number,
      default: 10
    },
    showSizeChanger: {
      type: Boolean,
      default: true
    },
    size: {
      type: String,
      default: 'middle'
    },
    scroll:{
      type:Object,
      default:() => ({ y: '50vh'})
    },
    alert: {
      type: [Object, Boolean],
      default: null
    },
    rowSelection: {
      type: Object,
      default: null
    },
    /** @Deprecated */
    showAlertInfo: {
      type: Boolean,
      default: false
    },
    showPagination: {
      type: String | Boolean,
      default: 'auto'
    },
    /**
     * enable page URI mode
     *
     * e.g:
     * /users/1
     * /users/2
     * /users/3?queryParam=test
     * ...
     */
    pageURI: {
      type: Boolean,
      default: false
    },
    extraTool: {
      type: Array,
      default: () => ([])
    }
  }),
  watch: {
    'localPagination.current' (val) {
      this.pageURI && this.$router.push({
        ...this.$route,
        name: this.$route.name,
        params: Object.assign({}, this.$route.params, {
          pageNo: val
        })
      })
    },
    pageNum (val) {
      Object.assign(this.localPagination, {
        current: val
      })
    },
    pageSize (val) {
      Object.assign(this.localPagination, {
        pageSize: val
      })
    },
    showSizeChanger (val) {
      Object.assign(this.localPagination, {
        showSizeChanger: val
      })
    }
  },
  created () {
    const { pageNo } = this.$route.params
    const localPageNum = this.pageURI && (pageNo && parseInt(pageNo)) || this.pageNum
    this.localPagination = ['auto', true].includes(this.showPagination) && Object.assign({}, this.localPagination, {
      current: localPageNum,
      pageSize: this.pageSize,
      showSizeChanger: this.showSizeChanger,
      //pageSizeOptions: ['10', '20', '30', '40', '50'], //????????????
      showTotal: (total, range) => {
        return range[0] + '-' + range[1] + '???' + total + '???'
      }
    }) || false
    this.needTotalList = this.initTotalList(this.columns)
    this.loadData()
    // this.columnsSetting = this.columns
    //?????????????????????????????????????????????key

    


    this.columnsSetting = []
    let cacheColumns=this.$ls.get(this.$route.path);
    if(cacheColumns && cacheColumns.length>0){
    	this.columnsSetting=cacheColumns;

      this.columns.forEach((item,index,arr)=>{
        let temp=this.columnsSetting.find(m=>m.dataIndex==item.dataIndex);
        //????????????
        if(temp){
          arr[index].checked=temp.checked;
        }
      })
      
      this.columnsSetting = this.columns
    }
    else{
    	this.columnsSetting = this.columns
    }
  },
  methods: {
    /**
     * ????????????????????????
     * ??????????????? true, ???????????????????????????
     * @param Boolean bool
     */
    refresh (bool = false) {
      bool && (this.localPagination = Object.assign({}, {
        current: 1, pageSize: this.pageSize
      }))
      this.loadData()
    },
    /**
     * ??????????????????
     * @param {Object} pagination ???????????????
     * @param {Object} filters ????????????
     * @param {Object} sorter ????????????
     */
    loadData (pagination, filters, sorter) {
      this.localLoading = true
      const parameter = Object.assign({
        pageNo: (pagination && pagination.current) ||
          this.showPagination && this.localPagination.current || this.pageNum,
        pageSize: (pagination && pagination.pageSize) ||
          this.showPagination && this.localPagination.pageSize || this.pageSize
      },
      (sorter && sorter.field && {
        sortField: sorter.field
      }) || {},
      (sorter && sorter.order && {
        sortOrder: sorter.order
      }) || {}, {
        ...filters
      }
      )
      const result = this.data(parameter)
      // ??????????????????????????????????????????????????????????????? r.pageNo, r.totalCount, r.data
      // eslint-disable-next-line
      if ((typeof result === 'object' || typeof result === 'function') && typeof result.then === 'function') {
        result.then(r => {
          if (r == null) {
            this.localLoading = false
            return
          }
          this.localPagination = this.showPagination && Object.assign({}, this.localPagination, {
            current: r.pageNo, // pageNo, // ?????????????????????????????????
            total: r.totalRows, // totalCount, // ??????????????????????????????
            showSizeChanger: this.showSizeChanger,
            pageSize: (pagination && pagination.pageSize) ||
              this.localPagination.pageSize
          }) || false
          // ????????????rows???null????????????
          if (r.rows == null) {
            r.rows = []
          }
          // ??????????????????????????????????????????????????????????????? 0 ,????????????????????????
          if (r.rows.length === 0 && this.showPagination && this.localPagination.current > 1) {
            this.localPagination.current--
            this.loadData()
            return
          }

          // ??????????????????????????????????????? r.totalCount ??? this.showPagination = true ??? pageNo ??? pageSize ?????? ??? totalCount ???????????? pageNo * pageSize ?????????
          // ??????????????????????????????????????????????????????????????? table ????????????
          try {
            if ((['auto', true].includes(this.showPagination) && r.totalCount <= (r.totalPage * this.localPagination.pageSize))) {
              this.localPagination.hideOnSinglePage = true
            }
          } catch (e) {
            this.localPagination = false
          }
          this.localDataSource = this.showPagination? r.rows:r // ??????????????????????????????
          this.localLoading = false
        })
      }
    },
    initTotalList (columns) {
      const totalList = []
      columns && columns instanceof Array && columns.forEach(column => {
        if (column.needTotal) {
          totalList.push({
            ...column,
            total: 0
          })
        }
      })
      return totalList
    },
    /**
     * ???????????????????????????????????? total ??????
     * @param selectedRowKeys
     * @param selectedRows
     */
    updateSelect (selectedRowKeys, selectedRows) {
      this.selectedRows = selectedRows
      this.selectedRowKeys = selectedRowKeys
      const list = this.needTotalList
      this.needTotalList = list.map(item => {
        return {
          ...item,
          total: selectedRows.reduce((sum, val) => {
            const total = sum + parseInt(get(val, item.dataIndex))
            return isNaN(total) ? 0 : total
          }, 0)
        }
      })
    },
    /**
     * ?????? table ????????????
     */
    clearSelected () {
      if (this.rowSelection) {
        this.rowSelection.onChange([], [])
        this.updateSelect([], [])
      }
    },
    /**
     * ???????????? table ?????????????????? clear ??????????????????????????????????????????
     * @param callback
     * @returns {*}
     */
    renderClear (callback) {
      if (this.selectedRowKeys.length <= 0) return null
      return (
        <a style="margin-left: 24px" onClick={() => {
          callback()
          this.clearSelected()
        }}>??????</a>
      )
    },
    renderAlert () {
      // ?????????????????????
      // eslint-disable-next-line no-unused-vars
      const needTotalItems = this.needTotalList.map((item) => {
        return (<span style="margin-right: 12px">
          {item.title}?????? <a style="font-weight: 600">{!item.customRender ? item.total : item.customRender(item.total)}</a>
        </span>)
      })

      // ?????? ?????? ??????
      // eslint-disable-next-line no-unused-vars
      const clearItem = (typeof this.alert.clear === 'boolean' && this.alert.clear) ? (
        this.renderClear(this.clearSelected)
      ) : (this.alert !== null && typeof this.alert.clear === 'function') ? (
        this.renderClear(this.alert.clear)
      ) : null

      // ?????? alert ??????
      // ???????????????alert??????
      return ''
      /* return (
        <a-alert showIcon={true} style="margin-bottom: 16px">
          <template slot="message">
            <span style="margin-right: 12px">?????????: <a style="font-weight: 600">{this.selectedRows.length}</a></span>
            {needTotalItems}
            {clearItem}
          </template>
        </a-alert>
      ) */
    },
    columnChange(val) {
      this.columnsSetting = val
      this.$ls.set(this.$route.path, val)
    },
    renderHeader () {
      let tools = [
        {
          icon: 'reload',
          title: '??????',
          onClick: () => {
            this.refresh()
          }
        },
        {
          icon: 'column-height',
          title: '??????',
          isDropdown: true,
          menu: () => {
            const onClick = ({ key }) => {
              this.customSize = key
            }
            return (
              <a-menu slot="overlay" onClick={onClick} selectable defaultSelectedKeys={[this.customSize]}>
                <a-menu-item key="default">??????</a-menu-item>
                <a-menu-item key="middle">??????</a-menu-item>
                <a-menu-item key="small">??????</a-menu-item>
              </a-menu>
            )
          },
          onClick: () => {
          }
        },
        {
          icon: 'setting',
          title: '?????????',
          isDropdown: true,
          menu: () => {
            //return <columnSetting slot="overlay" columns={this.columns} onColumnChange={this.columnChange} />
            return <columnSetting slot="overlay" columns={this.columnsSetting} onColumnChange={this.columnChange} />
          },
          onClick: () => {
          }
        }
      ]
      if (this.extraTool.length) {
        tools = tools.concat(this.extraTool)
      }

      return (
        <div class="s-table-tool">
          <div class="s-table-tool-left">
            {this.$scopedSlots.operator && this.$scopedSlots.operator()}
          </div>
          <div class="s-table-tool-right">
            {
              tools.map(tool => {
                if (tool.isDropdown) {
                  return (
                    <a-dropdown trigger={['click']}>
                      <a-tooltip title={tool.title} class="s-tool-item" onClick={tool.onClick}>
                        <a-icon type={tool.icon}/>
                      </a-tooltip>
                      { tool.menu() }
                    </a-dropdown>
                  )
                }
                return (
                  <a-tooltip title={tool.title} class="s-tool-item" onClick={tool.onClick}>
                    <a-icon type={tool.icon} />
                  </a-tooltip>
                )
              })
            }
          </div>
        </div>
      )
      /* return (
        <a-alert showIcon={true} style="margin-bottom: 16px">
          <template slot="message">
            <span style="margin-right: 12px">?????????: <a style="font-weight: 600">{this.selectedRows.length}</a></span>
            {needTotalItems}
            {clearItem}
          </template>
        </a-alert>
      ) */
    }
  },

  render () {
    let props = {}
    const localKeys = Object.keys(this.$data)
    const showAlert = (typeof this.alert === 'object' && this.alert !== null && this.alert.show) && typeof this.rowSelection.selectedRowKeys !== 'undefined' || this.alert

    Object.keys(T.props).forEach(k => {
      const localKey = `local${k.substring(0, 1).toUpperCase()}${k.substring(1)}`
      if (localKeys.includes(localKey)) {
        props[k] = this[localKey]
        return props[k]
      }
      if (k === 'rowSelection') {
        if (showAlert && this.rowSelection) {
          // ??????????????????alert?????????????????? rowSelection ??????
          props[k] = {
            ...this.rowSelection,
            selectedRows: this.selectedRows,
            selectedRowKeys: this.selectedRowKeys,
            onChange: (selectedRowKeys, selectedRows) => {
              this.updateSelect(selectedRowKeys, selectedRows)
              typeof this[k].onChange !== 'undefined' && this[k].onChange(selectedRowKeys, selectedRows)
            }
          }
          return props[k]
        } else if (!this.rowSelection) {
          // ????????????????????? rowSelection ???????????????????????????
          props[k] = null
          return props[k]
        }
      }
      this[k] && (props[k] = this[k])
      // ??????????????????????????????????????????
      props = {
        ...props,
        size: this.customSize,
        columns: this.columnsSetting.filter(value => value.checked === undefined || value.checked)
      }
      return props[k]
    })
    const table = (
      <a-table {...{ props, scopedSlots: { ...this.$scopedSlots } }} onChange={this.loadData} onExpand={ (expanded, record) => { this.$emit('expand', expanded, record) } }>
        { Object.keys(this.$slots).map(name => (<template slot={name}>{this.$slots[name]}</template>)) }
      </a-table>
    )

    return (
      <div class="table-wrapper">
        { this.renderHeader() }
        { showAlert ? this.renderAlert() : null }
        { table }
      </div>
    )
  }
}
