# Generated manually for improved dynamic fields with field configuration references

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('fitments', '0006_fitment_dynamicfields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='fitment',
            name='dynamicFields',
            field=models.JSONField(
                blank=True, 
                default=dict, 
                help_text='Dynamic fields with field configuration references: {field_config_id: {value: \'...\', field_name: \'...\', field_config_id: 123}}'
            ),
        ),
    ]
