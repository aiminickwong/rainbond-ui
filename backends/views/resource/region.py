# -*- coding: utf8 -*-

import logging

from rest_framework.response import Response

from backends.services.exceptions import *
from backends.services.regionservice import region_service
from backends.services.resultservice import *
from backends.views.base import BaseAPIView

logger = logging.getLogger("default")


class RegionView(BaseAPIView):

    def post(self, request, *args, **kwargs):
        """
        添加数据中心
        ---
        parameters:
            - name: region_id
              description: 数据中心id
              required: true
              type: string
              paramType: form
            - name: region_name
              description: 数据中心英文名称
              required: true
              type: string
              paramType: form
            - name: region_alias
              description: 数据中心中文名
              required: true
              type: string
              paramType: form
            - name: url
              description: url
              required: true
              type: string
              paramType: form
            - name: token
              description: token
              required: true
              type: string
              paramType: form

        """
        try:
            region_name = request.data.get("region_name", None)
            region_id = request.data.get("region_id", None)
            region_alias = request.data.get("region_alias", None)
            url = request.data.get("url", None)
            token = request.data.get("token", None)
            region_service.add_region(region_id, region_name, region_alias, url, token)
            code = "0000"
            msg = "success"
            msg_show = "添加成功"
            result = generate_result(code, msg, msg_show)
        except RegionUnreachableError as e:
            result = generate_result("2003","region unreachable","数据中心无法访问,请确认数据中心配置正确")
        except RegionExistError as e:
            result = generate_result("2001", "region exist", e.message)
        except Exception as e:
            logger.exception(e)
            result = generate_error_result()
        return Response(result)


class RegionDetailView(BaseAPIView):

    def put(self, request, region_id, *args, **kwargs):
        """
        修改数据中心
        ---
        parameters:
        -   name: body
            description: 修改内容 字段有 region_name,region_alias,url,token,status(上下线)
            required: true
            type: string
            paramType: body
        """
        try:
            data = request.data
            params = {}
            for k, v in data.iteritems():
                params[k] = v
            region_service.update_region(region_id, **params)
            code = "0000"
            msg = "success"
            msg_show = "数据中心修改成功"
            result = generate_result(code, msg, msg_show)
        except RegionNotExistError as e:
            result = generate_result("2002", "region not exist", e.message)
        except RegionExistError as e:
            result = generate_result("2001", "region exist", e.message)
        except Exception as e:
            logger.exception(e)
            result = generate_error_result()
        return Response(result)

    def delete(self,request,region_id,*args,**kwargs):
        """
        删除数据中心
        ---
         parameters:
            - name: region_id
              description: 租户id
              required: true
              type: string
              paramType: path
        """
        try:
            region_service.delete_region_by_region_id(region_id)
            result = generate_result("0000", "success", "数据中心删除成功")
        except Exception as e:
            logger.exception(e)
            result = generate_error_result()
        return Response(result)


class RegionStatusView(BaseAPIView):
    def put(self, request, region_id, *args, **kwargs):
        """
        数据中心上下线
        ---
        parameters:
            - name: region_id
              description: 租户id
              required: true
              type: string
              paramType: path
            - name: action
              description: 操作类型online:上线 offline下线
              required: true
              type: string
              paramType: form
        """
        try:
            action = request.data.get("action", None)
            if not action:
                raise ParamsError("参数错误")
            if action not in ("online","offline"):
                raise ParamsError("参数错误")
            msg_show = "操作成功"
            if action == "online":
                msg_show = "上线成功"
            elif action == "offline":
                msg_show = "下线成功"
            region_service.region_status_mange(region_id,action)
            code = "0000"
            msg = "success"
            result = generate_result(code, msg, msg_show)
        except RegionNotExistError as e:
            result = generate_result("2002", "region not exist", e.message)
        except RegionUnreachableError as e:
            msg_show = "数据中心无法上线,请查看相关配置是否正确"
            result = generate_result("2003", "region unreachable", msg_show)
        except ParamsError as e:
            result = generate_result("1003", "params error", "参数错误")
        except Exception as e:
            logger.exception(e)
            result = generate_error_result()
        return Response(result)
