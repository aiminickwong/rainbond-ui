# -*- coding: utf-8 -*-
import json
import logging
import time

import re
from rest_framework.response import Response
from rest_framework_jwt.settings import api_settings

from console.forms.users_operation import RegisterForm
from console.repositories.perm_repo import perms_repo
from console.services.enterprise_services import enterprise_services
from console.services.region_services import region_services
from console.services.team_services import team_services
from console.services.user_services import user_services
from console.views.base import BaseApiView, JWTAuthApiView
from www import perms
from www.forms.account import PasswordResetForm
from www.models import Users, SuperAdminUser
from www.perms import PermActions, UserActions
from www.utils.crypt import AuthCode
from www.utils.mail import send_reset_pass_mail
from www.utils.return_message import general_message, error_message

jwt_payload_handler = api_settings.JWT_PAYLOAD_HANDLER
jwt_encode_handler = api_settings.JWT_ENCODE_HANDLER

logger = logging.getLogger("default")


class TenantServiceView(BaseApiView):
    allowed_methods = ('POST',)

    def post(self, request, *args, **kwargs):
        """
        注册用户、需要先访问captcha路由来获取验证码
        ---
        parameters:
            - name: user_name
              description: 用户名
              required: true
              type: string
              paramType: body
            - name: email
              description: 邮箱
              required: true
              type: string
              paramType: body
            - name: password
              description: 密码，最少八位
              required: true
              type: string
              paramType: body
            - name: password_repeat
              description: 确认密码
              required: true
              type: string
              paramType: body
            - name: captcha_code
              description: 验证码
              required: true
              type: string
              paramType: body
            - name: register_type
              description: 注册方式 暂: 邀请注册 invitation 其它方式暂无 有拓展再修改
              required: false
              type: string
              paramType: body
            - name: value
              description: 数值 此处需要 team_id
              required: false
              type: string
              paramType: body
        """
        try:
            import copy
            querydict = copy.copy(request.data)
            querydict.update({
                u'real_captcha_code':
                    request.session.get("captcha_code")
            })
            client_ip = request.META.get("REMOTE_ADDR", None)
            register_form = RegisterForm(querydict)

            if register_form.is_valid():
                nick_name = register_form.cleaned_data["user_name"]
                email = register_form.cleaned_data["email"]
                password = register_form.cleaned_data["password"]
                # 创建一个用户
                user_info = dict()
                user_info["email"] = email
                user_info["nick_name"] = nick_name
                user_info["client_ip"] = client_ip
                user_info["is_active"] = 1
                user = Users(**user_info)
                user.set_password(password)
                enterprise = enterprise_services.get_enterprise_first()
                if not enterprise:
                    enterprise = enterprise_services.create_enterprise()
                user.enterprise_id = enterprise.enterprise_id
                user.save()

                try:
                    if Users.objects.count() == 1:
                        SuperAdminUser.objects.create(user_id=user.user_id)
                    enterprise = enterprise_services.get_enterprise_first()
                    register_type = request.data.get("register_type", None)
                    value = request.data.get("value", None)
                    if register_type == "invitation":
                        perm = perms_repo.add_user_tenant_perm(
                            perm_info={
                                "user_id": user.user_id,
                                "tenant_id": value,
                                "identity": "viewer",
                                "enterprise_id": enterprise.ID
                            }
                        )
                        if not perm:
                            result = general_message(400, "invited failed", "团队关联失败，注册失败")
                            return Response(result, status=400)
                    else:
                        team_alias = "{0}的团队".format(nick_name)
                        regions = region_services.get_open_regions()
                        if not regions:
                            result = general_message(400, "failed", "无可用数据中心")
                            return Response(result, status=400)
                        region_name = [regions[0].region_name]
                        code, msg, tenant = team_services.add_team(team_alias=team_alias, user=user,
                                                                   region_names=region_name)
                        if tenant:
                            perm = perms_repo.add_user_tenant_perm(
                                perm_info={
                                    "user_id": user.user_id,
                                    "tenant_id": tenant.ID,
                                    "identity": "owner",
                                    "enterprise_id": enterprise.ID
                                }
                            )
                            if not perm:
                                result = general_message(400, "invited failed", "团队关联失败，注册失败")
                                return Response(result, status=400)
                            data = dict()
                            data["user_id"] = user.user_id
                            data["nick_name"] = user.nick_name
                            data["email"] = user.email
                            data["enterprise_id"] = user.enterprise_id
                            data["creater"] = tenant.creater
                            payload = jwt_payload_handler(user)
                            token = jwt_encode_handler(payload)
                            data["token"] = token
                            result = general_message(200, "success", "注册成功", bean=data)
                            return Response(result, status=200)
                        else:
                            result = general_message(code=code, msg="failed", msg_show=msg)
                            return Response(result, status=400)
                    data = dict()
                    data["user_id"] = user.user_id
                    data["nick_name"] = user.nick_name
                    data["email"] = user.email
                    data["enterprise_id"] = user.enterprise_id
                    payload = jwt_payload_handler(user)
                    token = jwt_encode_handler(payload)
                    data["token"] = token
                    result = general_message(200, "register success", "注册成功", bean=data)
                    return Response(result, status=200)
                except Exception as e:
                    logger.exception(e)
                    user.delete()
                    result = general_message(500, "failed", "团队初始化错误")
                    return Response(result, status=500)
            else:
                error = {
                    "error": list(json.loads(register_form.errors.as_json()).values())[0][0].get("message", "参数错误")
                }
                result = general_message(400, "failed", "{}".format(error["error"]))
                return Response(result, status=400)
        except Exception as e:
            logger.exception(e)
            result = error_message(e.message)
            return Response(result, status=500)


class SendResetEmail(BaseApiView):
    def post(self, request, *args, **kwargs):
        """
        发送忘记密码邮件
        ---
        parameters:
            - name: email
              description: 邮箱
              required: true
              type: string
              paramType: form
        """
        email = request.POST.get("email", None)
        code = 200
        try:
            if email:
                if len(email) > 5:
                    if re.match("^.+\\@(\\[?)[a-zA-Z0-9\\-\\.]+\\.([a-zA-Z]{2,3}|[0-9]{1,3})(\\]?)$", email) != None:
                        if Users.objects.filter(email=email).exists():
                            # TODO 生成 url 并发送一封邮件
                            domain = self.request.META.get('HTTP_HOST')
                            timestamp = str(int(time.time()))
                            tag = AuthCode.encode(','.join([email, timestamp]), 'password')
                            link_url = 'http://%s/console/users/begin_password_reset?tag=%s' % (domain, tag)
                            content = "请点击下面的链接重置您的密码，%s" % link_url
                            try:
                                send_reset_pass_mail(email, content)
                            except Exception, e:
                                logger.error(
                                    "account.passwdreset",
                                    "send email to {0} failed".format(email))
                                logger.exception("account.passwdreset", e)
                            result = general_message(code, "success", "邮件发送成功")
                        else:
                            code = 400
                            result = general_message(code, "failed！", "当前用户没有注册！")
                        return Response(result, status=code)
                    else:
                        code = 400
                        result = general_message(code, "failed", "邮箱不合法!")
                        return Response(result, status=code)
            else:
                code = 400
                result = general_message(code, "failed", "邮件发送失败")
                return Response(result, status=code)
        except Exception as e:
            logger.exception(e)
            result = error_message(e.message)
            return Response(result, status=500)


class PasswordResetBegin(BaseApiView):
    def post(self, request, *args, **kwargs):
        """
        忘记密码
        ---
        parameters:
            - name: password
              description: 新密码
              required: true
              type: string
              paramType: form
            - name: password_repeat
              description: 确认密码
              required: true
              type: string
              paramType: form
        """
        try:
            tag = str(request.GET.get('tag'))
            email, old_timestamp = AuthCode.decode(tag, 'password').split(',')
            timestamp = int(time.time())
            if (timestamp - int(old_timestamp)) > 3600:
                logger.info("account.passwdreset",
                            "link expired, email: {0}, link_timestamp: {1}".format(
                                email, old_timestamp))
                result = general_message(400, "failed", "链接已失效")
                return Response(result, status=400)
            user = Users.objects.get(email=email)
            form = PasswordResetForm(request.POST)
            if form.is_valid():
                raw_password = request.POST.get('password')
                user.set_password(raw_password)
                user.save()
                result = general_message(200, "success", "修改密码成功")
                return Response(result, status=200)
            else:
                error = {
                    "error": list(json.loads(form.errors.as_json()).values())[0][0].get("message", "参数错误")
                }
                result = general_message(400, "failed", "参数错误,{}".format(error["error"]))
                return Response(result, status=400)
        except Exception as e:
            logger.exception(e)
            result = error_message(e.message)
            return Response(result, status=500)


class ChangeLoginPassword(JWTAuthApiView):
    def post(self, request, *args, **kwargs):
        """
        修改密码
        ---
        parameters:
            - name: password
              description: 原密码
              required: true
              type: string
              paramType: form
            - name: new_password
              description: 新密码
              required: true
              type: string
              paramType: form
            - name: new_password2
              description: 确认密码
              required: true
              type: string
              paramType: form
        """
        try:
            password = request.data.get("password", None)
            new_password = request.data.get("new_password", None)
            new_password2 = request.data.get("new_password2", None)
            u = request.user
            code = 400
            if not user_services.check_user_password(user_id=u.user_id, password=password):
                result = general_message(400, "old password error", "旧密码错误")
            elif new_password != new_password2:
                result = general_message(400, "two password disagree", "两个密码不一致")
            elif password == new_password:
                result = general_message(400, "old and new password agree", "新旧密码一致")
            else:
                status, info = user_services.update_password(user_id=u.user_id, new_password=new_password)
                if status:
                    code = 200
                    result = general_message(200, "change password success", "密码修改成功")
                else:
                    result = general_message(400, "password change failed", "密码修改失败")
            return Response(result, status=code)
        except Exception as e:
            logger.exception(e)
            result = error_message(e.message)
            return Response(result, status=500)


class UserDetailsView(JWTAuthApiView):
    def get(self, request, *args, **kwargs):
        """
        查询我的详情
        ---
        """
        try:
            p = PermActions()
            code = 200
            user = self.user
            user.actions = UserActions()
            tenants = team_services.get_current_user_tenants(user_id=user.user_id)
            user_detail = dict()
            user_detail["user_id"] = user.user_id
            user_detail["user_name"] = user.nick_name
            user_detail["email"] = user.email
            user_detail["enterprise_id"] = user.enterprise_id
            user_detail["phone"] = user.phone
            user_detail["git_user_id"] = user.git_user_id
            user_detail["is_sys_admin"] = user.is_sys_admin
            enterprise = enterprise_services.get_enterprise_by_enterprise_id(user.enterprise_id)
            user_detail["is_enterprise_active"] = enterprise.is_active
            tenant_list = list()
            for tenant in tenants:
                tenant_info = dict()
                team_region_list = region_services.get_region_list_by_team_name(request=request,
                                                                                team_name=tenant.tenant_name)
                tenant_info["team_id"] = tenant.ID
                tenant_info["team_name"] = tenant.tenant_name
                tenant_info["team_alias"] = tenant.tenant_alias
                tenant_info["limit_memory"] = tenant.limit_memory
                tenant_info["pay_level"] = tenant.pay_level
                tenant_info["region"] = team_region_list
                tenant_info["creater"] = tenant.creater
                tenant_info["create_time"] = tenant.create_time
                perms_list = team_services.get_user_perm_identitys_in_permtenant(user_id=user.user_id,
                                                                                 tenant_name=tenant.tenant_name)
                final_identity = perms.get_highest_identity(perms_list)
                tenant_info["identity"] = final_identity
                tenant_actions = p.keys('tenant_{0}_actions'.format(final_identity))
                user.actions.set_actions('tenant', tenant_actions)
                tenant_info["tenant_actions"] = user.actions.tenant_actions
                tenant_list.append(tenant_info)
            user_detail["teams"] = tenant_list
            result = general_message(code, "Obtain my details to be successful.", "获取我的详情成功", bean=user_detail)
        except Exception as e:
            code = 500
            logger.exception(e)
            result = error_message(e.message)
        return Response(result, status=code)

