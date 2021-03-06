import React, { PureComponent, Fragment } from 'react';
import moment from 'moment';
import { connect } from 'dva';
import { Link } from 'dva/router';
import { Row, Col, Card, Form, Button, Input, Icon, Menu, Dropdown, Modal, notification, Select, Radio,Checkbox,List,Switch, Tabs, Divider,InputNumber} from 'antd';
import { routerRedux } from 'dva/router';
import PageHeaderLayout from '../../layouts/PageHeaderLayout';
import ConfirmModal from '../../components/ConfirmModal';
import Ellipsis from '../../components/Ellipsis';
import FooterToolbar from '../../components/FooterToolbar';

import styles from './Index.less';
import mytabcss from './mytab.css';
import globalUtil from '../../utils/global';
import userUtil from '../../utils/user';
const TabPane = Tabs.TabPane;
const FormItem = Form.Item;
const {TextArea} = Input;
const ButtonGroup = Button.Group;

const RadioGroup = Radio.Group;
const { Option } = Select;
const { SubMenu } = Menu;
const formItemLayout = {
  labelCol: {
    span: 8,
  },
  wrapperCol: {
    span: 16,
  }
};
const tailFormItemLayout = {
  wrapperCol: {
      xs: {
          span: 24,
          offset: 0
      },
      sm: {
          span: 14,
          offset: 6
      }
  }
};

@Form.create()
class AppInfo extends PureComponent {
    componentDidMount(){
       if(this.props.getref){
           this.props.getref(this);
       }
    }

    handleSubmitApp = (e) => {
       const { dispatch } = this.props;
       this.props.form.validateFields((err, values) => {
          if (!err) {
            console.log(values);
          }
      });
    }
    getValue = (fun)=>{
        this.props.form.validateFields((err, values) => {
          if (!err) {
            fun(values)
          }
         });
    }
    handleCheckChange =(appname,val,e)=>{
        var name = {}
        var thisval = val;
        name[appname] = '**None**';
        if(e.target.checked){
            this.props.form.setFieldsValue(
              name);
        }else{
            name[appname] = thisval;
            this.props.form.setFieldsValue(name);
        }  
    }
    renderConnectInfo = () => {
        const app = this.props.app || {};
        const { getFieldDecorator, getFieldValue ,setFieldsValue} = this.props.form;
        if(app.service_connect_info_map_list && app.service_connect_info_map_list.length){
            return <div style={{marginBottom: 24}}>
            <h4 style={{marginBottom: 8}}>连接信息</h4>
            <Divider />
            <Row>
                {
                    app.service_connect_info_map_list.map((item) => {
                       return  <Col span={12}>
                            <FormItem
                              {...formItemLayout}
                              label={
                                  <Ellipsis length={6} tooltip>{item.attr_name}</Ellipsis>
                              }
                             >
                                {getFieldDecorator('connect||'+item.attr_name + '||attr_value', {
                                  initialValue: item.attr_value,
                                  rules: [{ required: true, message: '不能为空' }],
                                })(
                                  <Input placeholder={item.attr_value} />
                                )}
                                {getFieldDecorator('connect||'+ item.attr_name+'||'+'random', {
                                  rules: [{ required: false, message: '' }],
                                  initialValue:false
                                })(
                                  <Checkbox  onChange={this.handleCheckChange.bind(this,item.attr_name,item.attr_value)}>是否随机生成值</Checkbox>
                                )}
                                {getFieldDecorator('connect||'+ item.attr_name+'||'+'is_change', {
                                    rules: [{ required: false, message: '' }],
                                    initialValue: item.is_change
                                  })(
                                    <Checkbox>值是否可改</Checkbox>
                                  )}
                              </FormItem>
                       </Col>
                    })
                }
            </Row>
          </div>
        }
        return null;
    }
    renderEvn = () =>{
        const { getFieldDecorator, getFieldValue, setFieldsValue} = this.props.form;
        const app = this.props.app || {};
        if(app.service_env_map_list && app.service_env_map_list.length){
           return <div style={{marginBottom: 24}}>
            <h4 style={{marginBottom: 8}}>环境变量</h4>
            <Divider />
            <Row>
                 {
                    app.service_env_map_list.map((item) => {
                         return <Col span={12}>
                           <FormItem
                            {...formItemLayout}
                            label={
                                item.attr_name.length > 5 ?
                                <Ellipsis length={6} tooltip>{item.attr_name}</Ellipsis>
                                :
                                item.attr_name
                            }
                           >
                              {getFieldDecorator('env||'+item.attr_name + '||attr_value', {
                                initialValue: item.attr_value,
                                rules: [{ required: true, message: '不能为空' }],
                              })(
                                <Input />
                              )}
                              {getFieldDecorator('env||' + item.attr_name+'||'+'is_change', {
                                  initialValue: item.is_change,
                                  rules: [{ required: false, message: '' }]
                                })(
                                  <Checkbox>可否修改</Checkbox>
                                )}
                           </FormItem>
                         </Col>
                    })
                 }
                 
            </Row>
          </div>
        }
        return null;
    }
    renderExtend = () => {
        const app = this.props.app || {};
        const { getFieldDecorator, getFieldValue } = this.props.form;
        if(app.extend_method_map){
            return  <div style={{marginBottom: 24}}>
            <h4 style={{marginBottom: 8}}>伸缩规则</h4>
            <Divider />
            <Row>
                 <Col span={8}>
                   <FormItem
                    {...formItemLayout}
                    label={
                        <Ellipsis length={6} tooltip>最小节点(个)</Ellipsis>
                    }
                   >
                      {getFieldDecorator('extend||min_node', {
                        initialValue: app.extend_method_map.min_node,
                        rules: [{ required: true, message: '输入格式不正确' }],
                      })(
                        <InputNumber placeholder='请输入最小节点' min={app.extend_method_map.min_node}  max={app.extend_method_map.max_node} step={app.extend_method_map.step_node} />
                      )}
                   </FormItem>
                 </Col>
                 <Col span={8}>
                   <FormItem
                    {...formItemLayout}
                    label={
                        <Ellipsis length={6} tooltip>节点步长(个)</Ellipsis>
                    }
                   >
                      {getFieldDecorator('extend||step_node', {
                        initialValue: app.extend_method_map.step_node,
                        rules: [{ required: true, message: '输入格式不正确'}],
                      })(
                        <InputNumber placeholder='请输入节点步长' min={app.extend_method_map.min_node}  max={app.extend_method_map.max_node} />
                      )}
                   </FormItem>
                 </Col>
                 <Col span={8}>
                   <FormItem
                    {...formItemLayout}
                    label={
                        <Ellipsis length={6} tooltip>最小内存(M)</Ellipsis>
                    }
                   >
                      {getFieldDecorator('extend||min_memory', {
                        initialValue: app.extend_method_map.min_memory,
                        rules: [{ required: true, message: '输入格式不正确' }],
                      })(
                        <InputNumber placeholder='请输入最小内存' min={app.extend_method_map.min_memory}  max={app.extend_method_map.max_memory} step={app.extend_method_map.step_memory}/>
                      )}
                   </FormItem>
                 </Col>
            </Row>
          </div>
        }
        return null;
    }

    render(){
      const { getFieldDecorator, getFieldValue } = this.props.form;
      return (
            <Fragment>
              {this.renderConnectInfo()}
              {this.renderEvn()}
              {this.renderExtend()}
            </Fragment>
      )
    }
}


@connect(({ user, groupControl }) => ({
  currUser: user.currentUser,
  apps: groupControl.apps,
  groupDetail: groupControl.groupDetail || {}
}))
@Form.create()
export default class Main extends PureComponent {
constructor(arg){
    super(arg);
    this.state = {
        toDelete: false,
        recordShare:false,
        checkShare:true,
        ShareStep: 0,
        ID:0,
        info: null,
        selectedApp:'',
        service:null,
        key:''
    }
    this.com=[];
    this.share_group_info = null;
    this.share_service_list = null
  }
  getParams(){
     return {
         groupId: this.props.match.params.groupId,
         shareId: this.props.match.params.shareId
     }
  }
  componentDidMount() {
     this.getShareInfo();
  }
  getShareInfo(){
      const { dispatch, form, index } = this.props;
      const team_name = globalUtil.getCurrTeamName();
      const region_name = globalUtil.getCurrRegionName();
      const params = this.getParams();
      dispatch({
        type: 'groupControl/getShareInfo',
        payload: {
          team_name: team_name,
          ...params
        },
        callback: (data) => {
           var selectedApp = '';
           if(data.bean.share_service_list[0]){
              selectedApp = data.bean.share_service_list[0].service_alias;
           }
           this.setState({info: data.bean, selectedApp: selectedApp,key:data.bean.share_service_list[0].service_alias})
           this.share_group_info = data.bean.share_group_info;
           this.share_service_list = data.bean.share_service_list;
        },
        handleError: (res) => {
            if(res && res.status === 404){
              this.props.dispatch(routerRedux.push('/exception/404'));
            }
        }
      })
  }
  
  handleSubmit = (e) => {
     const { dispatch } = this.props;
     var newinfo={}
     this.props.form.validateFields((err, values) => {
        if (!err) {
           this.share_group_info['describe']= values.describe
           this.share_group_info['group_name']=values.group_name;
           this.share_group_info['scope']=values.scope;
           this.share_group_info['version']=values.version;
        }
      });
      
      //console.log(this.share_group_info);
      //console.log(this.share_service_list);
      var share_service_data = this.share_service_list;
      var comdata = this.com;
      comdata.map((app)=>{
          var apptab = app.props.tab;
          var appvalue = null;
          app.props.form.validateFields((err, values) => {
              if (!err) {
                appvalue = values;
                console.log(values)
              }
          });
          //////
          share_service_data.map((option)=>{
             if(option.service_alias == apptab){
               console.log(option.service_alias);
               for(var index in appvalue){
                  var indexname = '';
                  var indexarr = [];
                  indexarr = index.split('||');
                  console.log(indexarr);
                  if(indexarr[0] == 'connect' && indexarr[2]!='random'){
                      option['service_connect_info_map_list'].map((serapp)=>{
                          if(serapp['attr_name'] == indexarr[1]){
                             serapp[indexarr[2]] = appvalue[index];
                          }
                      })
                  }
                  if(indexarr[0] == 'env'){
                      option['service_env_map_list'].map((serapp)=>{
                          if(serapp['attr_name'] == indexarr[1]){
                             serapp[indexarr[2]] = appvalue[index];
                          }
                      })
                  } 
                  if(indexarr[0] == 'extend'){
                      option['extend_method_map'][indexarr[1]] = appvalue[index];
                  }
                }
             }
          })
          //////
      })
       console.log(share_service_data);
       newinfo['share_group_info']= this.share_group_info;
       newinfo['share_service_list']=share_service_data;
       const team_name = globalUtil.getCurrTeamName();
        var shareId = this.props.match.params.shareId;
        var groupId = this.props.match.params.groupId;
       dispatch({
          type: 'groupControl/subShareInfo',
          payload: {
              team_name: team_name,
              share_id: shareId,
              new_info:newinfo
          },
          callback: (data) => {
              dispatch(routerRedux.push(`/groups/share/two/${groupId}/${shareId}`))
          }
          // handleError: (res) => {
          //     if(res && res.status === 404){
          //       this.props.dispatch(routerRedux.push('/exception/404'));
          //     }
          // }
       })
   }
  
  handleGiveup = () => {
    console.log(this.props.match.params.shareId)
    var groupId = this.props.match.params.groupId;

    const { dispatch } = this.props;
    dispatch({
      type: 'groupControl/giveupShare',
      payload: {
         team_name: globalUtil.getCurrTeamName(),
         share_id:this.props.match.params.shareId 
      },
      callback: (data) => {
         dispatch(routerRedux.push(`/groups/${groupId}`))
      }
    })
  }

  componentWillUnmount() {
  }
  save = (val)=>{
      this.com.push(val); 
  }
  tabClick =(val,e)=>{
     this.setState({key:val});
  }
  render() {
    const info = this.state.info;
    if(!info){
        return null;
    }
    
    const appinfo = info.share_group_info || {};
    const apps = info.share_service_list || [];
    const tabk = this.state.key ;
    const { getFieldDecorator, getFieldValue } = this.props.form;

    const pageHeaderContent = (
      <div className={styles.pageHeaderContent}>
        <div className={styles.content}>
          <div className={styles.contentTitle}>{info.share_group_info.group_name || '-'}</div>
        </div>
      </div>
    );

  
    return (
      <PageHeaderLayout
        content={pageHeaderContent}
      >
          <div>
          <Card 
                style={{ marginBottom: 24 }}
                title="基本信息"
                bordered={false}
                bodyStyle={{ padding: 0 }}
          >
            <div style={{padding:"24px"}}>
            <Form layout="horizontal" className={styles.stepForm}>
             <Row gutter={24}>
                 <Col span="12">
                    <Form.Item
                      {...formItemLayout}
                      label='应用名'
                    >
                      {getFieldDecorator('group_name', {
                        initialValue: appinfo.group_name,
                        rules: [{ required: true, message: '应用名不能为空' }],
                      })(
                        <Input placeholder="默认使用上次应用名或应用组名" />
                      )}
                    </Form.Item>

                 </Col>
                 <Col span="12">
                  <Form.Item
                      {...formItemLayout}
                      label= '版本'
                    >
                      {getFieldDecorator('version', {
                        initialValue: appinfo.version,
                        rules: [{ required: true, message: '版本不能为空' }],
                      })(
                        <Input placeholder="默认使用上次的版本" />
                      )}
                    </Form.Item>
                 </Col>

                 <Col span="12">
                   <Form.Item
                      {...formItemLayout}
                      label= '应用说明'
                    >
                      {getFieldDecorator('describe', {
                        initialValue: appinfo.describe,
                        rules: [{ required: false, message: '请输入应用说明' }],
                      })(
                        <TextArea placeholder="请输入应用说明" />
                      )}
                    </Form.Item>
                 </Col>
                 <Col span="12">
                    <Form.Item
                      {...formItemLayout}
                      label= '分享范围'
                    >
                      {getFieldDecorator('scope', {
                        initialValue: 'team',
                        rules: [{ required: true }],
                      })(
                          <RadioGroup>
                            <Radio value='team'>团队</Radio>
                            <Radio value='enterprise'>公司</Radio>
                            <Radio value='goodrain'>好雨公有云市</Radio>
                          </RadioGroup>
                      )}
                    </Form.Item>
                 </Col>
             </Row>
             </Form>
             </div>
          </Card>
          <Card 
                style={{ marginBottom: 24 }}
                title="应用信息配置"
                bordered={false}
                bodyStyle={{ padding: 0 }}
          >
            <div style={{padding: '24px'}}>
                <div className="mytab"> 
                    <div className={mytabcss.mytabtit} id="mytabtit"> 
                     {
                        apps.map((apptit)=>{
                            return  (
                                tabk == apptit.service_alias ?
                                <a tab={apptit.service_cname} key={apptit.service_alias} href="javacsript:;" onClick={this.tabClick.bind(this,apptit.service_alias)} className={mytabcss.active}>{apptit.service_cname}</a>
                                :
                                <a tab={apptit.service_cname} key={apptit.service_alias} href="javacsript:;" onClick={this.tabClick.bind(this,apptit.service_alias)}>{apptit.service_cname}</a>
                            )
                        })
                     }
                   </div>
                   {
                      apps.map((app)=>{
                          return   ( 
                              tabk == app.service_alias ?
                              <div key={app.service_alias}><AppInfo app={app} getref={this.save}  tab={app.service_alias} /> </div>
                              :
                              <div style={{display:'none'}} key={app.service_alias}><AppInfo  app={app} getref={this.save}  tab={app.service_alias}/> </div>
                          )
                      })
                   }
                </div>
            </div>
          </Card>
          <FooterToolbar>
              <Button type="primary" htmlType="submit" onClick={this.handleSubmit}>提交</Button>
              <Button onClick={this.handleGiveup}>放弃</Button>
          </FooterToolbar>
         
      </div>
      </PageHeaderLayout>
    );
  }
}
