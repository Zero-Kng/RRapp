from rest_framework import serializers

from lugares.models import Cidade


class CidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cidade
        fields = ["slug", "nome", "estado"]
